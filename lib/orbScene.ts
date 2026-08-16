import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { THEMES, type ThemeId } from "./themes";
import type { AudioMetrics } from "./audioEngine";

export interface SceneTelemetry {
  fps: number;
  drawCalls: number;
  triangles: number;
  activeMeshes: number;
  coreOutput: number;
  coreTemp: number;
  fluxDensity: number;
}

export interface OrbSceneApi {
  rotateBy(deltaTheta: number, deltaPhi: number): void;
  zoomBy(factor: number): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  setTheme(themeId: ThemeId): void;
  setAudioMetrics(metrics: AudioMetrics): void;
  setExplode(explode: boolean): void;
  setCompress(compress: boolean): void;
  toggleExplode(): boolean;
  toggleCompress(): boolean;
  getTelemetry(): SceneTelemetry;
  dispose(): void;
}

const HOME_POSITION = new THREE.Vector3(0, 0.5, 5.5);
const MIN_DISTANCE = 0.6;
const MAX_DISTANCE = 40;

export function createOrbScene(
  container: HTMLElement,
  initialTheme: ThemeId = "amber",
): OrbSceneApi {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // ——— SCENE & CAMERA ———
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
  camera.position.copy(HOME_POSITION);

  // High-fidelity WebGLRenderer with ACES Filmic Tone Mapping
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);

  // ——— FULL CINEMATIC HOLOGRAPHIC POST-PROCESSING ———
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let currentTheme = THEMES[initialTheme] || THEMES.amber;

  // Full-resolution Cinematic Bloom
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    currentTheme.bloomStrength * 1.1,
    0.45,
    0.15,
  );
  composer.addPass(bloom);

  // Chromatic aberration + holographic scanline dispersion shader
  const chromaticShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uIntensity: { value: 0.0035 },
      uTint: { value: new THREE.Vector3(...currentTheme.chromaticTint) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec2 dir = vUv - vec2(0.5);
        float d = length(dir);
        float offset = uIntensity * d;
        float flicker = 1.0 + 0.025 * sin(uTime * 35.0) * sin(uTime * 9.3);
        vec4 cr = texture2D(tDiffuse, vUv + dir * offset);
        vec4 cg = texture2D(tDiffuse, vUv);
        vec4 cb = texture2D(tDiffuse, vUv - dir * offset * 0.5);
        vec4 col = vec4(cr.r, cg.g * 1.05, cb.b * 0.6, 1.0) * flicker;
        gl_FragColor = vec4(col.rgb * uTint, 1.0);
      }
    `,
  };
  const chromaticPass = new ShaderPass(chromaticShader);
  composer.addPass(chromaticPass);

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = MIN_DISTANCE;
  controls.maxDistance = MAX_DISTANCE;
  controls.zoomSpeed = 1.4;
  controls.enablePan = false;

  // Material tracking arrays for instant theme synchronization
  const brightMaterials: THREE.Material[] = [];
  const midMaterials: THREE.Material[] = [];
  const dimMaterials: THREE.Material[] = [];
  const faintMaterials: THREE.Material[] = [];
  const hotMaterials: THREE.Material[] = [];

  function lineMat(
    colorType: "bright" | "mid" | "dim" | "faint" | "hot",
    opacity = 1,
  ) {
    const col = currentTheme[colorType];
    const m = new THREE.LineBasicMaterial({
      color: col,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    if (colorType === "bright") brightMaterials.push(m);
    else if (colorType === "mid") midMaterials.push(m);
    else if (colorType === "dim") dimMaterials.push(m);
    else if (colorType === "faint") faintMaterials.push(m);
    else if (colorType === "hot") hotMaterials.push(m);
    return m;
  }

  function latRing(radius: number, lat: number, segs = 96) {
    const r = radius * Math.cos(lat);
    const y = radius * Math.sin(lat);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  function meridian(radius: number, lon: number, segs = 96) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const lat = (i / segs) * Math.PI - Math.PI / 2;
      pts.push(
        new THREE.Vector3(
          radius * Math.cos(lat) * Math.cos(lon),
          radius * Math.sin(lat),
          radius * Math.cos(lat) * Math.sin(lon),
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  // ═══════════════════════════════════════════════
  // LAYER 1: MULTI-LAYER OUTER WIREFRAME SHELL
  // ═══════════════════════════════════════════════
  const outerShell = new THREE.Group();
  const R1 = 2.0;

  for (let i = -14; i <= 14; i++) {
    const lat = (i / 14) * (Math.PI / 2) * 0.95;
    const opacity = i % 3 === 0 ? 0.55 : 0.15;
    const colorType = i % 3 === 0 ? "mid" : "faint";
    outerShell.add(new THREE.Line(latRing(R1, lat), lineMat(colorType, opacity)));
  }

  for (let i = 0; i < 24; i++) {
    const lon = (i / 24) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    outerShell.add(
      new THREE.Line(
        meridian(R1, lon),
        lineMat(isMajor ? "mid" : "faint", isMajor ? 0.65 : 0.12),
      ),
    );
  }

  // Cross Meridians (High Density Core)
  const CROSS_LINES = 16;
  const CROSS_SPREAD = 0.28;
  for (let i = 0; i < 4; i++) {
    const lon = (i / 4) * Math.PI * 2;
    for (let j = 0; j < CROSS_LINES; j++) {
      const t = (j / (CROSS_LINES - 1)) * 2 - 1;
      const offset = (t * CROSS_SPREAD) / 2;
      const falloff = 1 - Math.abs(t) * 0.7;
      const opacity = 0.9 * falloff;
      const colorType = Math.abs(t) < 0.3 ? "bright" : "mid";
      outerShell.add(
        new THREE.Line(meridian(R1, lon + offset, 120), lineMat(colorType, opacity)),
      );
    }
  }

  // Equator High-Energy Band
  const EQ_LINES = 18;
  const EQ_SPREAD = 0.38;
  for (let j = 0; j < EQ_LINES; j++) {
    const t = (j / (EQ_LINES - 1)) * 2 - 1;
    const offset = (t * EQ_SPREAD) / 2;
    const falloff = 1 - Math.abs(t) * 0.65;
    const opacity = 0.85 * falloff;
    const colorType = Math.abs(t) < 0.3 ? "bright" : "mid";
    outerShell.add(
      new THREE.Line(latRing(R1, offset, 120), lineMat(colorType, opacity)),
    );
  }

  orbGroup.add(outerShell);

  // ═══════════════════════════════════════════════
  // LAYER 2: SPHERICAL HOLOGRAPHIC GRID PANELS
  // ═══════════════════════════════════════════════
  const panelGroup = new THREE.Group();

  function createSpherePanel(
    latCenter: number,
    lonCenter: number,
    latSpan: number,
    lonSpan: number,
    radius: number,
    divisions = 4,
  ) {
    const group = new THREE.Group();
    const mat = lineMat("dim", 0.3);

    for (let i = 0; i <= divisions; i++) {
      const lat = latCenter - latSpan / 2 + (i / divisions) * latSpan;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= divisions * 2; j++) {
        const lon = lonCenter - lonSpan / 2 + (j / (divisions * 2)) * lonSpan;
        pts.push(
          new THREE.Vector3(
            radius * Math.cos(lat) * Math.cos(lon),
            radius * Math.sin(lat),
            radius * Math.cos(lat) * Math.sin(lon),
          ),
        );
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }

    for (let j = 0; j <= divisions; j++) {
      const lon = lonCenter - lonSpan / 2 + (j / divisions) * lonSpan;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= divisions * 2; i++) {
        const lat = latCenter - latSpan / 2 + (i / (divisions * 2)) * latSpan;
        pts.push(
          new THREE.Vector3(
            radius * Math.cos(lat) * Math.cos(lon),
            radius * Math.sin(lat),
            radius * Math.cos(lat) * Math.sin(lon),
          ),
        );
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    return group;
  }

  for (let i = 0; i < 28; i++) {
    const lat = (Math.random() - 0.5) * Math.PI * 0.85;
    const lon = Math.random() * Math.PI * 2;
    const size = 0.18 + Math.random() * 0.28;
    panelGroup.add(createSpherePanel(lat, lon, size, size, R1 + 0.012, 4));
  }
  orbGroup.add(panelGroup);

  // ═══════════════════════════════════════════════
  // LAYER 3: SECONDARY CONCENTRIC SHELL
  // ═══════════════════════════════════════════════
  const shell2 = new THREE.Group();
  const R2 = 2.12;

  for (let i = 0; i < 16; i++) {
    const lat = (Math.random() - 0.5) * Math.PI * 0.85;
    const startLon = Math.random() * Math.PI * 2;
    const arcLen = 0.4 + Math.random() * 1.4;
    const pts: THREE.Vector3[] = [];
    const segs = 48;
    const r = R2 * Math.cos(lat);
    const y = R2 * Math.sin(lat);
    for (let j = 0; j <= segs; j++) {
      const a = startLon + (j / segs) * arcLen;
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
    }
    shell2.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        lineMat("mid", 0.25 + Math.random() * 0.35),
      ),
    );
  }
  orbGroup.add(shell2);

  // ═══════════════════════════════════════════════
  // LAYER 4: INNER SPIRAL GEODESIC CORE
  // ═══════════════════════════════════════════════
  const innerCore = new THREE.Group();
  const R3 = 0.95;

  for (let s = 0; s < 8; s++) {
    const pts: THREE.Vector3[] = [];
    const turns = 3.5 + Math.random() * 2.5;
    const segs = 180;
    const phase = (s / 8) * Math.PI * 2;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const lat = t * Math.PI - Math.PI / 2;
      const lon = t * turns * Math.PI * 2 + phase;
      pts.push(
        new THREE.Vector3(
          R3 * Math.cos(lat) * Math.cos(lon),
          R3 * Math.sin(lat),
          R3 * Math.cos(lat) * Math.sin(lon),
        ),
      );
    }
    innerCore.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        lineMat("bright", 0.4),
      ),
    );
  }

  for (let i = -5; i <= 5; i++) {
    const lat = (i / 5) * (Math.PI / 2) * 0.9;
    innerCore.add(new THREE.Line(latRing(R3, lat, 64), lineMat("dim", 0.22)));
  }
  orbGroup.add(innerCore);

  // ═══════════════════════════════════════════════
  // LAYER 5: INNERMOST GLOWING ARC REACTOR CORE
  // ═══════════════════════════════════════════════
  const coreR = 0.28;
  const icoGeo = new THREE.IcosahedronGeometry(coreR, 1);
  const icoEdges = new THREE.EdgesGeometry(icoGeo);
  const icoWireMat = lineMat("hot", 1.0);
  const icoWire = new THREE.LineSegments(icoEdges, icoWireMat);
  orbGroup.add(icoWire);

  const coreSphereMat = new THREE.MeshBasicMaterial({
    color: currentTheme.hot,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
  });
  hotMaterials.push(coreSphereMat);
  const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), coreSphereMat);
  orbGroup.add(coreSphere);

  const glowSphereMat = new THREE.MeshBasicMaterial({
    color: currentTheme.mid,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
  });
  midMaterials.push(glowSphereMat);
  const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), glowSphereMat);
  orbGroup.add(glowSphere);

  // ═══════════════════════════════════════════════
  // DRIFTING CODE FRAGMENTS & HOLOGRAPHIC SPRITES
  // ═══════════════════════════════════════════════
  const codeSnippets = [
    "SYS.INIT()", "0xFF3A4B", "MALLOC(4096)", ">> SCANNING",
    "SYNC_ALL", "PTR_REF_0x0", "EXEC_ARC_CORE", "SHA256_VERIFY",
    "01101001", ">>> ONLINE", "HEAP_OK", "MUTEX_LOCK",
    "KERNEL.DAEMON", "AES-256-GCM", "J.A.R.V.I.S.", "U.L.T.R.O.N.",
    "NEURAL_MESH", "TELEMETRY.OK", "FLUX_1.28T", "CORE_312K",
  ];

  function makeTextSprite(text: string, size = 0.08) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = currentTheme.primaryHex;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 16);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    });
    brightMaterials.push(mat);
    const s = new THREE.Sprite(mat);
    s.scale.set(size * 5, size * 0.7, 1);
    return s;
  }

  interface SpriteDrift {
    phi: number;
    theta: number;
    r: number;
    speed: number;
  }

  function scatterText(
    count: number,
    sizeFn: () => number,
    rFn: () => number,
    speedScale: [number, number],
  ) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const sp = makeTextSprite(
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)],
        sizeFn(),
      );
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = rFn();
      sp.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      sp.userData = {
        phi,
        theta,
        r,
        speed:
          (speedScale[0] + Math.random() * speedScale[1]) *
          (Math.random() > 0.5 ? 1 : -1),
      } satisfies SpriteDrift;
      group.add(sp);
    }
    return group;
  }

  const textOuter = scatterText(
    280,
    () => 0.04 + Math.random() * 0.04,
    () => R1 + 0.03 + Math.random() * 0.08,
    [0.0003, 0.0008],
  );
  orbGroup.add(textOuter);

  const textInner = scatterText(
    50,
    () => 0.03 + Math.random() * 0.03,
    () => R3 + 0.02,
    [0.0006, 0.0012],
  );
  orbGroup.add(textInner);

  const textAmbient = scatterText(
    110,
    () => 0.03,
    () => R3 + 0.2 + Math.random() * (R1 - R3 - 0.3),
    [0.0004, 0.0007],
  );
  orbGroup.add(textAmbient);

  // ═══════════════════════════════════════════════
  // ORBITING DEBRIS SATELLITES
  // ═══════════════════════════════════════════════
  const debrisGeos = [
    new THREE.IcosahedronGeometry(0.015, 0),
    new THREE.IcosahedronGeometry(0.022, 0),
    new THREE.IcosahedronGeometry(0.03, 1),
    new THREE.TetrahedronGeometry(0.018, 0),
    new THREE.OctahedronGeometry(0.02, 0),
  ];

  interface DebrisOrbit {
    orbitR: number;
    speed: number;
    tiltX: number;
    tiltZ: number;
    phase: number;
  }

  const debris: THREE.Mesh[] = [];
  for (let i = 0; i < 90; i++) {
    const geo = debrisGeos[Math.floor(Math.random() * debrisGeos.length)];
    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.6 ? currentTheme.bright : currentTheme.mid,
      transparent: true,
      opacity: 0.35 + Math.random() * 0.55,
      blending: THREE.AdditiveBlending,
    });
    if (Math.random() > 0.6) brightMaterials.push(mat);
    else midMaterials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    const orbitR = 1.3 + Math.random() * 3.8;
    const speed = (0.08 + Math.random() * 0.55) * (Math.random() > 0.5 ? 1 : -1);
    const tiltX = (Math.random() - 0.5) * Math.PI * 0.9;
    const tiltZ = (Math.random() - 0.5) * Math.PI * 0.5;
    const phase = Math.random() * Math.PI * 2;
    mesh.userData = { orbitR, speed, tiltX, tiltZ, phase } satisfies DebrisOrbit;
    debris.push(mesh);
    orbGroup.add(mesh);
  }

  // ═══════════════════════════════════════════════
  // VOLUMETRIC DUST FIELD (2,200 PARTICLES)
  // ═══════════════════════════════════════════════
  const dustCount = 2200;
  const dustPos = new Float32Array(dustCount * 3);

  for (let i = 0; i < dustCount; i++) {
    const rr = 0.5 + Math.pow(Math.random(), 0.6) * 6.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
    dustPos[i * 3 + 1] = rr * Math.cos(phi);
    dustPos[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta);
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dustPos, 3));

  const dotC = document.createElement("canvas");
  dotC.width = dotC.height = 32;
  const dCtx = dotC.getContext("2d")!;
  const g = dCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.65)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  dCtx.fillStyle = g;
  dCtx.fillRect(0, 0, 32, 32);

  const dustMat = new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(dotC),
    size: 0.045,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    color: currentTheme.bright,
  });
  brightMaterials.push(dustMat);
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  orbGroup.add(dustPoints);

  // ═══════════════════════════════════════════════
  // SCANNING LASER RINGS
  // ═══════════════════════════════════════════════
  function makeScanRing(radius: number, thickness = 0.015) {
    const geo = new THREE.RingGeometry(radius - thickness, radius + thickness, 80);
    const mat = new THREE.MeshBasicMaterial({
      color: currentTheme.bright,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    brightMaterials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  const scanRing1 = makeScanRing(R1, 0.012);
  const scanRing2 = makeScanRing(R1 * 0.7, 0.009);
  orbGroup.add(scanRing1, scanRing2);

  // ═══════════════════════════════════════════════
  // GESTURE & CAMERA CONTROLS
  // ═══════════════════════════════════════════════
  const sphericalScratch = new THREE.Spherical();
  const offsetScratch = new THREE.Vector3();

  function rotateBy(deltaTheta: number, deltaPhi: number) {
    offsetScratch.copy(camera.position).sub(controls.target);
    sphericalScratch.setFromVector3(offsetScratch);
    sphericalScratch.theta -= deltaTheta;
    sphericalScratch.phi = THREE.MathUtils.clamp(
      sphericalScratch.phi - deltaPhi,
      0.05,
      Math.PI - 0.05,
    );
    sphericalScratch.makeSafe();
    offsetScratch.setFromSpherical(sphericalScratch);
    camera.position.copy(controls.target).add(offsetScratch);
    camera.lookAt(controls.target);
  }

  function zoomBy(factor: number) {
    offsetScratch.copy(camera.position).sub(controls.target);
    const dist = THREE.MathUtils.clamp(
      offsetScratch.length() * factor,
      MIN_DISTANCE,
      MAX_DISTANCE,
    );
    offsetScratch.setLength(dist);
    camera.position.copy(controls.target).add(offsetScratch);
  }

  function resetView() {
    camera.position.copy(HOME_POSITION);
    controls.target.set(0, 0, 0);
    camera.lookAt(controls.target);
    controls.update();
  }

  // ═══════════════════════════════════════════════
  // THEME SWITCHER
  // ═══════════════════════════════════════════════
  function setTheme(themeId: ThemeId) {
    currentTheme = THEMES[themeId] || THEMES.amber;

    brightMaterials.forEach((m) => {
      if ("color" in m) (m as any).color.setHex(currentTheme.bright);
    });
    midMaterials.forEach((m) => {
      if ("color" in m) (m as any).color.setHex(currentTheme.mid);
    });
    dimMaterials.forEach((m) => {
      if ("color" in m) (m as any).color.setHex(currentTheme.dim);
    });
    faintMaterials.forEach((m) => {
      if ("color" in m) (m as any).color.setHex(currentTheme.faint);
    });
    hotMaterials.forEach((m) => {
      if ("color" in m) (m as any).color.setHex(currentTheme.hot);
    });

    bloom.strength = currentTheme.bloomStrength;
    chromaticPass.uniforms.uTint.value.set(...currentTheme.chromaticTint);
  }

  // ═══════════════════════════════════════════════
  // AUDIO & GEOMETRIC STATE
  // ═══════════════════════════════════════════════
  let currentAudio: AudioMetrics = {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
    freqData: new Uint8Array(128),
    timeData: new Uint8Array(256),
  };

  let isExploded = false;
  let isCompressed = false;
  let explodeLerp = 0;
  let compressLerp = 0;

  function setAudioMetrics(metrics: AudioMetrics) {
    currentAudio = metrics;
  }

  function setExplode(explode: boolean) {
    isExploded = explode;
    if (explode) isCompressed = false;
  }

  function setCompress(compress: boolean) {
    isCompressed = compress;
    if (compress) isExploded = false;
  }

  function toggleExplode(): boolean {
    setExplode(!isExploded);
    return isExploded;
  }

  function toggleCompress(): boolean {
    setCompress(!isCompressed);
    return isCompressed;
  }

  let fps = 60;
  let frameCount = 0;
  let lastFpsTime = performance.now();

  function getTelemetry(): SceneTelemetry {
    return {
      fps: Math.round(fps),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      activeMeshes: scene.children.length + orbGroup.children.length,
      coreOutput: Number((94.2 + Math.sin(performance.now() * 0.002) * 4.6 + currentAudio.overall * 10).toFixed(1)),
      coreTemp: Number((312.4 + Math.sin(performance.now() * 0.001) * 6.2 + (isCompressed ? 45 : 0)).toFixed(1)),
      fluxDensity: Number((1.24 + currentAudio.bass * 0.8 + (isExploded ? 0.9 : 0)).toFixed(2)),
    };
  }

  // ═══════════════════════════════════════════════
  // CINEMATIC ANIMATION & RENDER LOOP
  // ═══════════════════════════════════════════════
  const startEpoch = performance.now();
  let rafId = 0;
  let disposed = false;

  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const now = performance.now();
    const t = (now - startEpoch) * 0.001;

    frameCount++;
    if (now - lastFpsTime >= 500) {
      fps = (frameCount * 1000) / (now - lastFpsTime);
      frameCount = 0;
      lastFpsTime = now;
    }

    const targetExplode = isExploded ? 1 : 0;
    const targetCompress = isCompressed ? 1 : 0;
    explodeLerp += (targetExplode - explodeLerp) * 0.08;
    compressLerp += (targetCompress - compressLerp) * 0.1;

    const audioBass = currentAudio.bass;
    const audioMid = currentAudio.mid;
    const audioOverall = currentAudio.overall;

    // Shell scaling and audio pulse
    const outerScale = (1 + explodeLerp * 1.35) * (1 - compressLerp * 0.45) + audioBass * 0.12;
    outerShell.scale.setScalar(outerScale);
    outerShell.rotation.y += 0.0015 * (1 + compressLerp * 3.0);
    outerShell.rotation.x = Math.sin(t * 0.08) * 0.05 + audioMid * 0.05;

    const panelScale = (1 + explodeLerp * 1.55) * (1 - compressLerp * 0.4) + audioMid * 0.08;
    panelGroup.scale.setScalar(panelScale);
    panelGroup.rotation.y += 0.0018 * (1 + compressLerp * 2.5);
    panelGroup.rotation.x = Math.sin(t * 0.08 + 0.5) * 0.04;

    const shell2Scale = (1 + explodeLerp * 1.1) * (1 - compressLerp * 0.35) + audioBass * 0.1;
    shell2.scale.setScalar(shell2Scale);
    shell2.rotation.y -= 0.001 * (1 + compressLerp * 2.0);

    const innerScale = (1 + explodeLerp * 0.4) * (1 - compressLerp * 0.2) + audioBass * 0.2;
    innerCore.scale.setScalar(innerScale);
    innerCore.rotation.y -= (0.005 + audioOverall * 0.015) * (1 + compressLerp * 4.0);

    icoWire.rotation.x += (0.008 + audioOverall * 0.03) * (1 + compressLerp * 5.0);
    icoWire.rotation.y += (0.012 + audioOverall * 0.04) * (1 + compressLerp * 5.0);

    // Glowing core reactor surge
    const wave1 = Math.sin(t * 1.2);
    const wave3 = Math.pow(Math.max(0, Math.sin(t * 0.4)), 5);
    const surge = wave3 * 1.5 + audioBass * 2.5 + (isCompressed ? 2.2 : 0);
    const coreScale = 1 + surge + Math.sin(t * 5) * 0.05 + (isCompressed ? 0.6 : 0);
    coreSphere.scale.setScalar(coreScale);

    const coreOpacity = Math.min(
      0.85,
      0.1 + wave1 * 0.05 + surge * 0.3 + (isCompressed ? 0.4 : 0),
    );
    coreSphereMat.opacity = Math.max(0, coreOpacity);

    glowSphere.scale.setScalar(1 + surge * 1.1 + (isCompressed ? 1.5 : 0));
    glowSphereMat.opacity = Math.min(0.5, 0.04 + surge * 0.15 + (isCompressed ? 0.25 : 0));

    icoWire.scale.setScalar(1 + surge * 0.8);
    icoWireMat.opacity = Math.min(1, 0.5 + surge * 0.5);

    // Orbiting satellites
    const speedMult = 1 + compressLerp * 4.0 + audioOverall * 2.0;
    debris.forEach((d) => {
      const u = d.userData as DebrisOrbit;
      const a = t * u.speed * speedMult + u.phase;
      const currentOrbitR = u.orbitR * (1 + explodeLerp * 0.8) * (1 - compressLerp * 0.6);
      d.position.set(
        currentOrbitR * Math.cos(a) * Math.cos(u.tiltX),
        currentOrbitR * Math.sin(u.tiltX) * Math.sin(a * 0.8) +
          Math.sin(a * 0.3 + u.tiltZ) * 0.2,
        currentOrbitR * Math.sin(a) * Math.cos(u.tiltZ),
      );
      d.rotation.x += 0.015 * speedMult;
      d.rotation.z += 0.01 * speedMult;
    });

    // Text drift
    const textSpread = 1 + explodeLerp * 1.4;
    textOuter.rotation.y += 0.0006 * (1 + compressLerp * 2.0);
    textInner.rotation.y -= 0.001 * (1 + compressLerp * 2.0);
    textAmbient.rotation.y += 0.0004;

    textOuter.scale.setScalar(textSpread);
    textInner.scale.setScalar(textSpread);
    textAmbient.scale.setScalar(textSpread);

    // Scan rings
    const scanY1 = Math.sin(t * 0.4) * R1 * outerScale;
    scanRing1.position.y = scanY1;
    const scanS1 = (Math.sqrt(Math.max(0, R1 * R1 * outerScale * outerScale - scanY1 * scanY1)) / R1) * outerScale;
    scanRing1.scale.set(scanS1, scanS1, 1);
    (scanRing1.material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 + audioMid);

    const scanY2 = Math.sin(t * 0.6 + 2) * R3 * innerScale;
    scanRing2.position.y = scanY2;
    const scanS2 = (Math.sqrt(Math.max(0, R3 * R3 * innerScale * innerScale - scanY2 * scanY2)) / R3) * innerScale;
    scanRing2.scale.set(scanS2, scanS2, 1);
    (scanRing2.material as THREE.MeshBasicMaterial).opacity = 0.2 * (1 + currentAudio.treble);

    // Dust particles
    dustPoints.rotation.y += 0.0003 * (1 + compressLerp * 5.0) + audioOverall * 0.002;
    dustPoints.scale.setScalar(1 + explodeLerp * 0.6 + audioBass * 0.15);

    // Dynamic Holographic Bloom Surge
    bloom.strength =
      currentTheme.bloomStrength +
      Math.sin(t * 0.8) * 0.25 +
      audioBass * 1.2 +
      compressLerp * 1.4;

    chromaticPass.uniforms.uTime.value = t;

    controls.update();
    composer.render();
  }

  animate();

  // ——— RESIZE ———
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // ——— CLEANUP ———
  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    controls.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const anyMat = mat as THREE.Material & { map?: THREE.Texture };
        anyMat.map?.dispose();
        mat.dispose();
      }
    });
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    rotateBy,
    zoomBy,
    zoomIn: () => zoomBy(0.65),
    zoomOut: () => zoomBy(1.55),
    resetView,
    setTheme,
    setAudioMetrics,
    setExplode,
    setCompress,
    toggleExplode,
    toggleCompress,
    getTelemetry,
    dispose,
  };
}
