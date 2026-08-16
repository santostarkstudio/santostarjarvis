"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

interface UltraEarthGlobeProps {
  cardId?: string;
  themeColor?: string;
  isMaximized?: boolean;
}

export function UltraEarthGlobe({
  themeColor = "#00e5ff",
  isMaximized = false,
}: UltraEarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"globe3d" | "googleEarth">("globe3d");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    city: string;
    accuracy?: number;
  }>({
    lat: 12.9716, // Default to Bengaluru/India
    lon: 77.5946,
    city: "Bengaluru, India",
  });
  const [locationStatus, setLocationStatus] = useState<string>("LOCATING USER...");
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [showNightLights, setShowNightLights] = useState<boolean>(true);
  const [orbitSpeed, setOrbitSpeed] = useState<number>(1);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconMeshRef = useRef<THREE.Group | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

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
            // Reverse geocode via free openstreetmap nominatim
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
          } catch {
            // fallback
          }

          setUserLocation({ lat, lon, city: cityName, accuracy });
          setLocationStatus(`LOCKED: ${cityName.toUpperCase()}`);
        },
        (error) => {
          console.warn("[GPS Warning]", error);
          setLocationStatus("DEFAULT COORDS (INDIA)");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus("GPS SENSOR OFFLINE");
    }
  }, []);

  // Helper: Convert Lat/Lon to 3D Cartesian Vector on Sphere
  const latLonToVector3 = useCallback((lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }, []);

  // 2. Initialize Ultra-Realistic Three.js 3D Earth
  useEffect(() => {
    if (viewMode !== "globe3d" || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3.2);
    cameraRef.current = camera;

    // Renderer with Anti-Aliasing and High Color Precision
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Texture Loader with fallbacks
    const textureLoader = new THREE.TextureLoader();

    // 4K / 2K Earth Textures
    const dayTexture = textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
      () => renderer.render(scene, camera)
    );
    const normalTexture = textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg"
    );
    const specularTexture = textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg"
    );
    const nightTexture = textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png"
    );
    const cloudsTexture = textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png"
    );

    // 1. Earth Core Sphere (Radius 1.0)
    const earthGeometry = new THREE.SphereGeometry(1.0, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: dayTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.45,
      metalness: 0.1,
      roughnessMap: specularTexture,
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.z = (23.4 * Math.PI) / 180; // Earth Axial Tilt (23.4 degrees)
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 2. Independent Real-Time Atmospheric Cloud Layer
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

    // 3. Glowing Fresnel Atmospheric Corona (Rayleigh Scattering)
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
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
          gl_FragColor = vec4(0.0, 0.898, 1.0, 1.0) * intensity * 1.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // 4. Stark Arc GPS Beacon Group at User Coordinates
    const beaconGroup = new THREE.Group();
    const beaconPos = latLonToVector3(userLocation.lat, userLocation.lon, 1.01);
    beaconGroup.position.copy(beaconPos);

    // Glowing Arc Core
    const pinGeometry = new THREE.SphereGeometry(0.022, 16, 16);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    beaconGroup.add(pinMesh);

    // Radiating Orbital Energy Rings
    const ringGeometry = new THREE.RingGeometry(0.03, 0.045, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.lookAt(beaconPos.clone().multiplyScalar(2));
    beaconGroup.add(ringMesh);

    // Laser Beam shooting into orbital space
    const beamGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.25, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    beamMesh.position.set(0, 0.125, 0);
    beaconGroup.add(beamMesh);

    earthMesh.add(beaconGroup);
    beaconMeshRef.current = beaconGroup;

    // 5. Lighting (Sunlight Directional Light + Ambient Space Fill)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0a192f, 0.6);
    scene.add(ambientLight);

    // 6. Animation Loop
    let pulseAngle = 0;
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Orbital Earth Rotation
      if (isRotating && earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.0015 * orbitSpeed;
      }

      // Faster dynamic cloud rotation
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.visible = showClouds;
        if (isRotating) cloudsMeshRef.current.rotation.y += 0.0022 * orbitSpeed;
      }

      // Pulsing Stark GPS Beacon
      pulseAngle += 0.05;
      const ringScale = 1.0 + Math.sin(pulseAngle) * 0.4;
      ringMesh.scale.set(ringScale, ringScale, 1);
      (ringMaterial as THREE.MeshBasicMaterial).opacity = 0.5 + Math.cos(pulseAngle) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Mouse / Touch Drag to Rotate & Zoom
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !earthMeshRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      earthMeshRef.current.rotation.y += deltaX * 0.005;
      earthMeshRef.current.rotation.x += deltaY * 0.005;

      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += deltaX * 0.005;
        cloudsMeshRef.current.rotation.x += deltaY * 0.005;
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + e.deltaY * 0.002,
        1.4,
        6.0
      );
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [viewMode, userLocation, isRotating, showClouds, orbitSpeed, latLonToVector3]);

  // Center camera directly on user's GPS coordinates
  const handleFocusOnLocation = () => {
    if (!earthMeshRef.current) return;
    setIsRotating(false);
    // Rotate Earth so user's lat/lon faces camera (0,0)
    const targetY = -((userLocation.lon + 90) * (Math.PI / 180));
    const targetX = (userLocation.lat * (Math.PI / 180)) * 0.5;

    earthMeshRef.current.rotation.y = targetY;
    earthMeshRef.current.rotation.x = targetX;
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y = targetY;
      cloudsMeshRef.current.rotation.x = targetX;
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(circle at center, #071322 0%, #020711 100%)",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Holographic Navigation Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: "linear-gradient(180deg, rgba(3, 15, 30, 0.92) 0%, rgba(3, 15, 30, 0.4) 80%, transparent 100%)",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#00e5ff", fontWeight: "bold", textShadow: "0 0 8px #00e5ff" }}>
            🌍 STARK ORBITAL EARTH 4K
          </span>
          <span
            style={{
              fontSize: "9px",
              background: "rgba(0, 229, 255, 0.15)",
              color: "#00e5ff",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              borderRadius: "4px",
              padding: "1px 5px",
            }}
          >
            {locationStatus}
          </span>
        </div>

        {/* View Mode Selector */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            style={{
              background: viewMode === "globe3d" ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 229, 255, 0.08)",
              border: viewMode === "globe3d" ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
              color: "#ffffff",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "10px",
              cursor: "pointer",
              fontWeight: viewMode === "globe3d" ? "bold" : "normal",
            }}
            onClick={() => setViewMode("globe3d")}
          >
            🌐 3D 4K GLOBE
          </button>
          <button
            type="button"
            style={{
              background: viewMode === "googleEarth" ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 229, 255, 0.08)",
              border: viewMode === "googleEarth" ? "1px solid #00e5ff" : "1px solid rgba(0, 229, 255, 0.25)",
              color: "#ffffff",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "10px",
              cursor: "pointer",
              fontWeight: viewMode === "googleEarth" ? "bold" : "normal",
            }}
            onClick={() => setViewMode("googleEarth")}
          >
            🛰️ GOOGLE EARTH
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "globe3d" ? (
        <div
          ref={mountRef}
          style={{
            width: "100%",
            height: "100%",
            cursor: isDraggingRef.current ? "grabbing" : "grab",
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", paddingTop: "32px", position: "relative" }}>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              `${userLocation.lat},${userLocation.lon}`
            )}&t=k&z=16&ie=UTF8&iwloc=&output=embed`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              filter: "contrast(115%) saturate(120%)",
            }}
            title="Google Earth Live Satellite View"
          />
        </div>
      )}

      {/* Bottom Floating Control Deck */}
      {viewMode === "globe3d" && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            right: "8px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(3, 15, 30, 0.85)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            borderRadius: "6px",
            padding: "4px 8px",
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Coordinates readout */}
          <div style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.8)", fontFamily: "monospace" }}>
            📍 <span style={{ color: "#00e5ff" }}>{userLocation.lat.toFixed(4)}° N, {userLocation.lon.toFixed(4)}° E</span>
          </div>

          {/* Quick interactive controls */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button
              type="button"
              style={{
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#ffffff",
                borderRadius: "3px",
                padding: "2px 6px",
                fontSize: "9px",
                cursor: "pointer",
              }}
              onClick={handleFocusOnLocation}
              title="Center camera on your live GPS beacon"
            >
              🎯 LOCK MY GPS
            </button>

            <button
              type="button"
              style={{
                background: isRotating ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#ffffff",
                borderRadius: "3px",
                padding: "2px 6px",
                fontSize: "9px",
                cursor: "pointer",
              }}
              onClick={() => setIsRotating(!isRotating)}
              title="Toggle orbital planetary spin"
            >
              🔄 {isRotating ? "SPIN ON" : "PAUSE"}
            </button>

            <button
              type="button"
              style={{
                background: showClouds ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#ffffff",
                borderRadius: "3px",
                padding: "2px 6px",
                fontSize: "9px",
                cursor: "pointer",
              }}
              onClick={() => setShowClouds(!showClouds)}
              title="Toggle atmospheric cloud layer"
            >
              ☁️ CLOUDS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
