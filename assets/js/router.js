const PUBLIC_ROUTES = new Set(["/login"]);
const PRIVATE_ROUTES = new Set(["/dashboard", "/treinos", "/tecnicas", "/apostila", "/perfil"]);

function normalize(hashValue) {
  const raw = (hashValue || "#/dashboard").replace(/^#/, "");
  if (!raw || raw === "/") {
    return "/dashboard";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function createRouter({ getCurrentUser, onRouteChange }) {
  function navigate(path) {
    const target = path.startsWith("/") ? path : `/${path}`;
    if (window.location.hash !== `#${target}`) {
      window.location.hash = `#${target}`;
      return;
    }
    resolve();
  }

  function resolve() {
    const user = getCurrentUser();
    let route = normalize(window.location.hash);

    const isKnownRoute = PUBLIC_ROUTES.has(route) || PRIVATE_ROUTES.has(route);
    if (!isKnownRoute) {
      route = user ? "/dashboard" : "/login";
    }

    if (!user && PRIVATE_ROUTES.has(route)) {
      navigate("/login");
      return;
    }

    if (user && route === "/login") {
      navigate("/dashboard");
      return;
    }

    onRouteChange(route, user);
  }

  function start() {
    window.addEventListener("hashchange", resolve);
    resolve();
  }

  return {
    start,
    navigate,
    refresh: resolve,
  };
}
