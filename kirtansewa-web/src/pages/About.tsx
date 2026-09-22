export function About() {
  return (
    <div className="flex-1 md:overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-10">
        <h1 className="text-text-primary text-xl font-semibold mb-4">
          About Kirtan Sewa
        </h1>
        <div className="text-text-secondary text-sm leading-relaxed space-y-3">
          <p>
            Kirtan Sewa is a free web player for Puratan Gurbani Kirtan. Browse
            artists, listen to rare recordings, and build your own queue.
          </p>
          <p>
            This project does not host any audio files. All audio content is
            sourced from and linked directly to{" "}
            <a
              href="https://kirtansewa.net"
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline"
            >
              kirtansewa.net
            </a>
            .
          </p>
        </div>

        <h2 className="text-text-primary text-lg font-semibold mt-8 mb-3">
          Acknowledgements
        </h2>
        <div className="text-text-secondary text-sm leading-relaxed space-y-3">
          <p>
            This project exists because of the incredible seva done by the team
            behind{" "}
            <a
              href="https://kirtansewa.net"
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline"
            >
              Kirtan Sewa
            </a>{" "}
            and their{" "}
            <a
              href="https://www.youtube.com/@kirtansewa4226"
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline"
            >
              YouTube channel
            </a>
            . They have spent years lovingly collecting, preserving, and sharing
            Puratan Gurbani Kirtan recordings, photographs, and information
            about various Kirtaniye, making this treasure of Gurbani accessible
            to sangat everywhere. All credit and kudos for the audio content
            belongs to them.
          </p>
          <p>
            This player grew out of my own deep appreciation for their hard work
            and my personal love for Puratan Keertan. I wanted a simple,
            dedicated way to listen to these recordings, and I hope it serves
            the sangat well.
          </p>
          <p>All mistakes in this project are mine alone.</p>
        </div>

        <h2 className="text-text-primary text-lg font-semibold mt-8 mb-3">
          Contact
        </h2>
        <div className="text-text-secondary text-sm leading-relaxed space-y-3">
          <p>
            If you find any issues with this site or have suggestions, please
            reach out at{" "}
            <a
              href="mailto:info.gursingh@gmail.com"
              className="text-gold hover:underline"
            >
              info.gursingh@gmail.com
            </a>
            .
          </p>
          <p>
            To contribute recordings, photographs, or Raagi information to the
            original Kirtan Sewa collection, please contact them directly at{" "}
            <a
              href="mailto:kirtansewamalaysia@gmail.com"
              className="text-gold hover:underline"
            >
              kirtansewamalaysia@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
