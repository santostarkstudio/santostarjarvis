"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { type HandPointer } from "@/lib/handTracker";

interface UltraEarthGlobeProps {
  cardId?: string;
  themeColor?: string;
  isMaximized?: boolean;
  handPointers?: HandPointer[];
}

type CelestialBody = "earth" | "moon" | "mars" | "jupiter" | "saturn" | "sun";

interface CelestialInfo {
  name: string;
  icon: string;
  texture: string;
  normalTexture?: string;
  specularTexture?: string;
  radius: number;
  rotationSpeed: number;
  tiltDegrees: number;
  atmosphereColor: string;
  description: string;
}

const CELESTIAL_BODIES: Record<CelestialBody, CelestialInfo> = {
  earth: {
    name: "EARTH // TERRA",
    icon: "🌍",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    normalTexture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
    specularTexture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
    radius: 1.0,
    rotationSpeed: 0.0015,
    tiltDegrees: 23.4,
    atmosphereColor: "#00e5ff",
    description: "Home Planet • Level 10 Stark HQ & GPS Beacon",
  },
  moon: {
    name: "MOON // LUNA",
    icon: "🌕",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg",
    radius: 0.85,
    rotationSpeed: 0.0008,
    tiltDegrees: 1.5,
    atmosphereColor: "#ffffff",
    description: "Earth's Natural Satellite • Lunar Relay Station",
  },
  mars: {
    name: "MARS // ARES",
    icon: "🔴",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/mars_1k_color.jpg",
    radius: 0.9,
    rotationSpeed: 0.0014,
    tiltDegrees: 25.2,
    atmosphereColor: "#ff5533",
    description: "Red Planet • Olympus Mons & Stark Rover Outpost",
  },
  jupiter: {
    name: "JUPITER // JOVE",
    icon: "🪐",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg",
    radius: 1.25,
    rotationSpeed: 0.003,
    tiltDegrees: 3.1,
    atmosphereColor: "#ffaa44",
    description: "Gas Giant • Great Red Spot Atmospheric Matrix",
  },
  saturn: {
    name: "SATURN // KRONOS",
    icon: "🪐",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg",
    radius: 1.1,
    rotationSpeed: 0.0028,
    tiltDegrees: 26.7,
    atmosphereColor: "#e6c387",
    description: "Ringed Gas Giant • Orbital Ice Ring System",
  },
  sun: {
    name: "SOL // ARC CORE",
    icon: "☀️",
    texture: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    radius: 1.35,
    rotationSpeed: 0.0005,
    tiltDegrees: 7.25,
    atmosphereColor: "#ffcc00",
    description: "Solar Star • Thermonuclear Fusion Energy Core",
  },
};

export function UltraEarthGlobe({
  themeColor = "#00e5ff",
  isMaximized = false,
  handPointers = [],
}: UltraEarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"globe3d" | "googleEarth">("globe3d");
  const [selectedBody, setSelectedBody] = useState<CelestialBody>("earth");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    city: string;
    accuracy?: number;
  }>({
    lat: 12.9716, // Bengaluru, India
    lon: 77.5946,
    city: "Bengaluru, India",
  });
  const [locationStatus, setLocationStatus] = useState<string>("LOCATING GPS...");
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [handGestureFeedback, setHandGestureFeedback] = useState<string>("OPTICAL GESTURES ACTIVE");

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconMeshRef = useRef<THREE.Group | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const ringsMeshRef = useRef<THREE.Mesh | null>(null);

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const previousHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const previousBimanualDistRef = useRef<number | null>(null);

  // 1. Fetch Real GPS Location
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setLocationStatus("ACQUIRING GPS LOCK...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          let cityName = `LAT: ${lat.toFixed(4)}°, LON: ${lon.toFixed(4)}°`;
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address;
              cityName =
                addr.city ||
                addr.town ||
                addr.state_district ||
                addr.state ||
                addr.country ||
                cityName;
            }
          } catch {}

          setUserLocation({ lat, lon, city: cityName, accuracy });
          setLocationStatus(`LOCKED: ${cityName.toUpperCase()}`);
        },
        () => {
          setLocationStatus("DEFAULT COORDS (INDIA)");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const latLonToVector3 = useCallback((lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }, []);

  // 2. Initialize Three.js Deep Space & Planetary Scene
  useEffect(() => {
    if (viewMode !== "globe3d" || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || (isMaximized ? window.innerWidth : 400);
    const height = container.clientHeight || (isMaximized ? window.innerHeight : 300);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, isMaximized ? 2.9 : 3.3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const info = CELESTIAL_BODIES[selectedBody];

    // Main Celestial Body Mesh
    const geometry = new THREE.SphereGeometry(info.radius, 64, 64);
    let material: THREE.Material;

    if (selectedBody === "sun") {
      material = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
      });
    } else {
      const texture = textureLoader.load(info.texture, () => renderer.render(scene, camera));
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.1,
      });
    }

    const planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.rotation.z = (info.tiltDegrees * Math.PI) / 180;
    scene.add(planetMesh);
    planetMeshRef.current = planetMesh;

    // Earth Specific: Clouds & GPS Beacon
    if (selectedBody === "earth") {
      const cloudsTexture = textureLoader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png"
      );
      const cloudsGeometry = new THREE.SphereGeometry(1.015, 64, 64);
      const cloudsMaterial = new THREE.MeshStandardMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      cloudsMesh.rotation.z = (23.4 * Math.PI) / 180;
      scene.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // Stark GPS Beacon
      const beaconGroup = new THREE.Group();
      const beaconPos = latLonToVector3(userLocation.lat, userLocation.lon, 1.01);
      beaconGroup.position.copy(beaconPos);

      const pinMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      beaconGroup.add(pinMesh);

      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.035, 0.05, 32),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
      );
      ringMesh.lookAt(beaconPos.clone().multiplyScalar(2));
      beaconGroup.add(ringMesh);

      scene.add(beaconGroup);
      beaconMeshRef.current = beaconGroup;
    }

    // Saturn Specific: 3D Planetary Ring System
    if (selectedBody === "saturn") {
      const ringGeo = new THREE.RingGeometry(1.3, 2.1, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xcdb284,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.3;
      scene.add(ringMesh);
      ringsMeshRef.current = ringMesh;
    }

    // Atmospheric Glowing Corona
    const atmoGeo = new THREE.SphereGeometry(info.radius * 1.15, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.9, 1.0, 1.0) * intensity * 1.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);
    atmosphereMeshRef.current = atmoMesh;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, selectedBody === "sun" ? 2.5 : 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Animation Render Loop
    let lastTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isRotating && planetMeshRef.current) {
        planetMeshRef.current.rotation.y += info.rotationSpeed;
      }
      if (isRotating && cloudsMeshRef.current && showClouds) {
        cloudsMeshRef.current.rotation.y += info.rotationSpeed * 1.25;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [viewMode, selectedBody, isMaximized, isRotating, showClouds, userLocation, latLonToVector3]);

  // Hand Gestures Bridge (Pinch to spin & 2-Hand zoom)
  useEffect(() => {
    if (viewMode !== "globe3d" || !planetMeshRef.current || !cameraRef.current || handPointers.length === 0) {
      previousHandPosRef.current = null;
      previousBimanualDistRef.current = null;
      return;
    }

    const primaryHand = handPointers[0];

    // Single Hand Pinch-to-Spin
    if (primaryHand.isPinching) {
      if (previousHandPosRef.current) {
        const dx = primaryHand.x - previousHandPosRef.current.x;
        const dy = primaryHand.y - previousHandPosRef.current.y;
        planetMeshRef.current.rotation.y += dx * 4.5;
        planetMeshRef.current.rotation.x += dy * 3.5;
        setHandGestureFeedback("🤏 PINCH-SPINNING CELESTIAL BODY");
      }
      previousHandPosRef.current = { x: primaryHand.x, y: primaryHand.y };
    } else {
      previousHandPosRef.current = null;
    }

    // Two-Hand Bimanual Stretch-to-Zoom
    if (handPointers.length >= 2) {
      const h1 = handPointers[0];
      const h2 = handPointers[1];
      const dist = Math.hypot(h1.x - h2.x, h1.y - h2.y);

      if (previousBimanualDistRef.current !== null) {
        const delta = dist - previousBimanualDistRef.current;
        cameraRef.current.position.z = THREE.MathUtils.clamp(
          cameraRef.current.position.z - delta * 5.0,
          1.5,
          6.0
        );
        setHandGestureFeedback(delta > 0 ? "👐 TWO-HAND ZOOM IN" : "👐 TWO-HAND ZOOM OUT");
      }
      previousBimanualDistRef.current = dist;
    } else {
      previousBimanualDistRef.current = null;
    }
  }, [handPointers, viewMode]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: isMaximized ? "85vh" : "280px",
        background: "radial-gradient(circle at center, #020b18 0%, #000208 100%)",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header Deck */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "12px",
          right: "12px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(2, 10, 24, 0.85)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "6px",
          padding: "6px 12px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>{CELESTIAL_BODIES[selectedBody].icon}</span>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#00e5ff", letterSpacing: "1px" }}>
              {CELESTIAL_BODIES[selectedBody].name}
            </div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)" }}>
              {CELESTIAL_BODIES[selectedBody].description}
            </div>
          </div>
        </div>

        {/* Planet Selector Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["earth", "moon", "mars", "jupiter", "saturn", "sun"] as CelestialBody[]).map((body) => (
            <button
              key={body}
              type="button"
              style={{
                background: selectedBody === body ? "rgba(0, 229, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
                border: selectedBody === body ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.15)",
                color: selectedBody === body ? "#00e5ff" : "rgba(255, 255, 255, 0.7)",
                borderRadius: "4px",
                padding: "3px 7px",
                fontSize: "10px",
                fontWeight: selectedBody === body ? "bold" : "normal",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setSelectedBody(body)}
            >
              {CELESTIAL_BODIES[body].icon} {body.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", flex: 1 }} />

      {/* Bottom Telemetry Deck */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "12px",
          right: "12px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(2, 10, 24, 0.85)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: "6px",
          padding: "6px 12px",
          backdropFilter: "blur(8px)",
          fontSize: "10px",
          fontFamily: "monospace",
        }}
      >
        <div style={{ color: "#00ff88" }}>{handGestureFeedback}</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            style={{
              background: isRotating ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 8px",
              cursor: "pointer",
            }}
            onClick={() => setIsRotating(!isRotating)}
          >
            🔄 {isRotating ? "ROTATION ON" : "PAUSED"}
          </button>
          {selectedBody === "earth" && (
            <button
              type="button"
              style={{
                background: showClouds ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#fff",
                borderRadius: "4px",
                padding: "2px 8px",
                cursor: "pointer",
              }}
              onClick={() => setShowClouds(!showClouds)}
            >
              ☁️ CLOUDS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
