// Local unauthenticated forward proxy for Chrome on this VM.
//
// Chrome cannot use the VM egress proxy directly: it will not take proxy
// credentials from --proxy-server (ERR_NO_SUPPORTED_PROXIES) and Playwright's
// proxy auth still fails the CONNECT tunnel (ERR_TUNNEL_CONNECTION_FAILED).
// This tiny proxy listens on localhost:8888 with no auth and forwards every
// CONNECT / HTTP request to the egress proxy, adding the Proxy-Authorization
// header itself (credentials read fresh from the live env at startup, since
// the egress token rotates within minutes).
//
// Usage: node local-proxy.js &   (then point Chrome at http://127.0.0.1:8888)
const net = require('net');

const LISTEN_PORT = 8888;
const EGRESS_HOST = 'fd8b:4f84:7d32:99::1';
const EGRESS_PORT = 3128;

const proxyUrl = new URL(process.env.https_proxy || process.env.HTTPS_PROXY);
const auth = Buffer.from(
  `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`,
).toString('base64');

const server = net.createServer((client) => {
  let buffered = Buffer.alloc(0);
  let upstream = null;
  let connected = false;

  const onData = (chunk) => {
    if (connected) {
      upstream.write(chunk);
      return;
    }
    buffered = Buffer.concat([buffered, chunk]);
    const endIdx = buffered.indexOf('\r\n\r\n');
    if (endIdx === -1) return; // wait for full headers
    const head = buffered.subarray(0, endIdx).toString('latin1');
    const rest = buffered.subarray(endIdx + 4);
    const firstLine = head.split('\r\n')[0];
    const [method, target] = firstLine.split(' ');

    upstream = net.connect(EGRESS_PORT, EGRESS_HOST, () => {
      if (method === 'CONNECT') {
        upstream.write(
          `CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\nProxy-Authorization: Basic ${auth}\r\nProxy-Connection: keep-alive\r\n\r\n`,
        );
      } else {
        // Plain HTTP: absolute-form request line, auth header injected.
        const lines = head.split('\r\n').slice(1);
        const filtered = lines.filter(
          (l) => !/^proxy-authorization:/i.test(l),
        );
        upstream.write(
          `${firstLine}\r\nProxy-Authorization: Basic ${auth}\r\n${filtered.join('\r\n')}\r\n\r\n`,
        );
        if (rest.length) upstream.write(rest);
      }
    });

    let upstreamBuffered = Buffer.alloc(0);
    upstream.on('data', (data) => {
      if (method === 'CONNECT' && !connected) {
        upstreamBuffered = Buffer.concat([upstreamBuffered, data]);
        const idx = upstreamBuffered.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const respHead = upstreamBuffered
          .subarray(0, idx)
          .toString('latin1');
        if (!/^HTTP\/1\.[01] 200/.test(respHead)) {
          client.end(`HTTP/1.1 502 Bad Gateway\r\n\r\n${respHead}`);
          upstream.destroy();
          return;
        }
        connected = true;
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        const extra = upstreamBuffered.subarray(idx + 4);
        if (extra.length) client.write(extra);
        return;
      }
      client.write(data);
    });
    upstream.on('error', () => {
      if (!connected) client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      client.destroy();
    });
    upstream.on('close', () => client.destroy());
    client.on('close', () => upstream && upstream.destroy());
    client.on('error', () => upstream && upstream.destroy());
  };

  client.on('data', onData);
  client.on('error', () => upstream && upstream.destroy());
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`local proxy listening on 127.0.0.1:${LISTEN_PORT}`);
});
