export type AccountRole = "admin" | "viewer";

export const CFG = {
  localBase: "http://10.48.37.137",
  preferLocalControl: true,
  dataChannel: "3519558",
  dataReadKey: "ZSPP51V4CIZQBRNP",
  F: { moist1: 1, moist2: 2, flow: 3, pump: 4 },
  ctlChannel: "3539805",
  ctlReadKey: "9BZMEKIL2NB4RY2S",
  ctlWriteKey: "WV9MHEM64UOSF6L6",
  ctlFields: { pump: 1, valve1: 2, valve2: 3 },
  users: [
    { name: "Apelo, Pauline R.", user: "pauline_apelo", hash: "46688d1aee99e23ffa1c0083af2055120722b34e55f6b5bc322ba50d4a1d546e", role: "admin" },
    { name: "Amongo, Jessa Mae D.", user: "jm_amongo", hash: "c506b48894006edf3b50b4119c5e63c50248553b7011f58341db68f652129c1a", role: "admin" },
    { name: "Dalumpines, Mary Ellaine Joy C.", user: "ellaine_dalumpines", hash: "467bad80d9bd33e6b2f5021e9916738c1849666c0ded4afaf08edc40b91071ef", role: "admin" },
    { name: "Navarro, Lea May D.", user: "lea_navarro", hash: "4b7bfd400a45a717ed8002b780e2daa2ddfacb81a62937fa11610bc2c4827a7d", role: "admin" },
    { name: "Clavaton, Ricky John A.", user: "rengks_john_clavaton", hash: "6d7ff6932fec5262f78c0c2868c385148343242db132e1a6d5736ac95a4d45f1", role: "admin" },
    { name: "Caldeo, Axle Russ F.", user: "axlepogi", hash: "5e035c8c36eb84e118d4e2627c595efb43b5c85df10093bab8d73053fd4e1406", role: "admin" },
    { name: "Panel Controller", user: "panel", hash: "296d38c14dccd7b4bfd7b49411aef244ee59a4bbe1993609e247027ab80bb725", role: "admin" },
    { name: "Viewer Account", user: "admin", hash: "807225aac3e226a58de6e6d7e3144b55d54fafc8359b8212a52dd90597ac4887", role: "viewer" },
  ],
  idleMinutes: 5,
  lowThreshold: 35,
  highThreshold: 55,
  siteUrl: "https://aquagrow5.vercel.app/",
  weather: { name: "Brgy. Lanot, Roxas City, Capiz", lat: 11.5853, lon: 122.7511 },
  pollMs: 10000,
};

export type Account = (typeof CFG.users)[number];

export async function passwordHash(user: string, password: string) {
  const data = new TextEncoder().encode(`g5:${user.toLowerCase()}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
