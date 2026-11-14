// Redirect kk.now.cc (and subdomains) to kknow.cc, preserving path, query and hash.
(() => {
  const host = location.hostname;
  if (host === 'kk.now.cc' || host.endsWith('.kk.now.cc')) {
    const url = new URL(location.href);
    url.hostname = host.replace(/kk\.now\.cc$/, 'kknow.cc');
    url.port = '';
    location.replace(url.href);
  }
})();
