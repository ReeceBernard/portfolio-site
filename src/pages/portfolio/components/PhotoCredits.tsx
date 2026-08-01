type Credit = {
  label: string;
  author: string;
  license: string;
  licenseUrl: string;
};

// Attribution for the non-personal photos in the hero's helix, sourced from
// Wikimedia Commons under CC BY / CC BY-SA, which require attribution.
const CREDITS: Credit[] = [
  { label: 'New York', author: 'Dllu', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { label: 'Miraflores', author: 'Mira4espina78y', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0' },
  { label: 'Cusco', author: 'Diego Delso', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { label: 'Interlaken', author: 'Ank Kumar', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { label: 'Cassis', author: 'Acediscovery', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  { label: 'Barcelona', author: 'Ralf Roletschek', license: 'CC BY-SA 2.0 DE', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/de/deed.en' },
];

export const PhotoCredits = () => (
  <p className="text-[10px] leading-relaxed text-gray-300 text-center mt-2">
    Hero photos: {CREDITS.map((c, i) => (
      <span key={c.label}>
        {c.label} by {c.author}{' '}
        <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">
          ({c.license})
        </a>
        {i < CREDITS.length - 1 ? ' · ' : ''}
      </span>
    ))}
    {' '}— via Wikimedia Commons
  </p>
);
