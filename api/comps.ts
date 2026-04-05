import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import duckdb from "duckdb";

const ALLOWED_ORIGIN = process.env.IS_DEV ? "http://localhost:5173" : "https://reecebernard.dev";
const S3_BUCKET = process.env.DEALSCOUT_S3_BUCKET ?? "dealscout-data-dev";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export interface SalesComp {
  address: string;
  county: string;
  property_type: string | null;
  square_ft: number | null;
  year_built: number | null;
  sale_date: string;
  sale_price: number;
  price_per_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lat: number | null;
  lon: number | null;
}

export async function querySalesComps(
  county: string,
  subjectLat?: number,
  subjectLon?: number,
): Promise<SalesComp[]> {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKey || !secretKey) throw new Error("AWS credentials not configured");

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 3);
  const minDateStr = minDate.toISOString().slice(0, 10);

  // Haversine distance in miles (approximation valid for short distances)
  const distanceExpr = (subjectLat != null && subjectLon != null)
    ? `3958.8 * 2 * ASIN(SQRT(
         POWER(SIN(RADIANS((TRY_CAST(p.lat AS DOUBLE) - ${subjectLat}) / 2)), 2) +
         COS(RADIANS(${subjectLat})) * COS(RADIANS(TRY_CAST(p.lat AS DOUBLE))) *
         POWER(SIN(RADIANS((TRY_CAST(p.lon AS DOUBLE) - ${subjectLon}) / 2)), 2)
       ))`
    : "NULL";

  const orderBy = (subjectLat != null && subjectLon != null)
    ? `${distanceExpr} ASC NULLS LAST`
    : `s.sale_date DESC`;

  const coordFilter = (subjectLat != null && subjectLon != null)
    ? `AND p.lat IS NOT NULL AND p.lon IS NOT NULL`
    : "";

  return new Promise((resolve, reject) => {
    const db = new (duckdb as any).Database(":memory:");
    const conn = db.connect();

    conn.exec(
      `SET home_directory='/tmp';
       INSTALL httpfs;
       LOAD httpfs;
       SET s3_region='${region}';
       SET s3_access_key_id='${accessKey}';
       SET s3_secret_access_key='${secretKey}';`,
      (err: Error | null) => {
        if (err) {
          db.close();
          return reject(err);
        }

        conn.all(
          `SELECT
             p.address,
             p.county,
             p.property_type,
             CAST(p.square_ft AS INTEGER) AS square_ft,
             CAST(p.year_built AS INTEGER) AS year_built,
             CAST(s.sale_date AS VARCHAR) AS sale_date,
             CAST(s.sale_price AS DOUBLE) AS sale_price,
             CASE WHEN p.square_ft > 0
               THEN ROUND(s.sale_price / p.square_ft)::INTEGER
               ELSE NULL
             END AS price_per_sqft,
             TRY_CAST(p.bedrooms AS INTEGER) AS bedrooms,
             TRY_CAST(p.bathrooms AS DOUBLE) AS bathrooms,
             TRY_CAST(p.lat AS DOUBLE) AS lat,
             TRY_CAST(p.lon AS DOUBLE) AS lon
           FROM read_parquet('s3://${S3_BUCKET}/silver/properties.parquet') p
           JOIN read_parquet('s3://${S3_BUCKET}/silver/sales_transactions.parquet') s
             ON p.property_id = s.property_id
           WHERE LOWER(p.county) = '${county.toLowerCase()}'
             AND s.is_valid = true
             AND s.qualified_sale = true
             AND s.sale_price > 10000
             AND s.sale_date >= '${minDateStr}'
             AND (p.property_type IS NULL OR p.property_type NOT IN ('commercial', 'multi_family', 'land', 'mixed_use'))
             AND (p.square_ft IS NULL OR p.square_ft < 8000)
             ${coordFilter}
           ORDER BY ${orderBy}
           LIMIT 20`,
          (err: Error | null, rows: unknown[]) => {
            db.close();
            if (err) reject(err);
            else resolve((rows ?? []) as SalesComp[]);
          }
        );
      }
    );
  });
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (method !== "GET") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const county = event.queryStringParameters?.county;
  if (!county || !/^[a-zA-Z\s]+$/.test(county)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "county query param required (e.g. dekalb)" }) };
  }

  try {
    const comps = await querySalesComps(county);
    return { statusCode: 200, headers: CORS, body: JSON.stringify(comps) };
  } catch (error) {
    console.error("Comps query error:", error);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Failed to fetch comps" }) };
  }
};
