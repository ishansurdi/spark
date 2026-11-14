/** NASA PSI representative images (public domain), served from /public/img. */
export interface SiteImage {
  src: string;
  caption: string;
}

const IMAGES: Record<string, SiteImage> = {
  "PSI-25": { src: "/img/bass2-flame.jpg", caption: "BASS-II flame spreading over acrylic on the ISS" },
  "PSI-26": { src: "/img/bass2-flame.jpg", caption: "Flame over a solid sample in the BASS flow duct (BASS-II image)" },
  "PSI-10": { src: "/img/flame-design-space.jpg", caption: "ACME Flame Design: sooty spherical flame in microgravity" },
  "PSI-159": { src: "/img/flame-design-stages.jpg", caption: "Spherical flames on the ACME porous burner" },
  "PSI-23": { src: "/img/flame-design-stages.jpg", caption: "Spherical diffusion flames on the ACME burner" },
  "PSI-22": { src: "/img/efield-blue.jpg", caption: "E-FIELD Flames: a blue flame shaped by an electric field" },
  "PSI-21": { src: "/img/efield.jpg", caption: "Coflow flame on the ACME burner" },
  "PSI-20": { src: "/img/acme-hardware.jpg", caption: "ACME chamber insert hardware for the Combustion Integrated Rack" },
  "PSI-47": { src: "/img/daft-on-iss.jpg", caption: "DAFT dust measurements aboard the ISS" },
  "PSI-39": { src: "/img/cir-on-iss.jpg", caption: "Combustion Integrated Rack on the ISS" },
  "PSI-69": { src: "/img/cir-on-iss.jpg", caption: "Combustion Integrated Rack, home of the FLEX droplet hardware" },
  "PSI-68": { src: "/img/cir-on-iss.jpg", caption: "Combustion Integrated Rack, home of the FLEX-2 droplet hardware" },
};

export const imageFor = (id: string): SiteImage | undefined => IMAGES[id];
