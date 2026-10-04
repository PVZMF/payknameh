// Tech §2.3: the three surfaces are told apart by host, so the local dev server that
// Playwright starts gets its own *.localhost names on its own port.
export const LOCAL_PORT = 3100;

export const LOCAL_DOMAINS = {
  DOMAIN_MAIN: `payknameh.localhost:${LOCAL_PORT}`,
  DOMAIN_APP: `app.payknameh.localhost:${LOCAL_PORT}`,
  DOMAIN_SHORT: `pk.localhost:${LOCAL_PORT}`,
};
