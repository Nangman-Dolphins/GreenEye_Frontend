//StatsChart.jsx
import React, { useRef, useEffect, useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function StatsChart() {
  const canvasRef = useRef();
  const { authFetch } = useContext(AuthContext);
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await authFetch('/api/stats');
      if (res.ok) setPoints(await res.json());
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [authFetch]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);
    if (!points.length) return;
    const max = Math.max(...points);
    const barW = w / points.length;
    points.forEach((v, i) => {
      const barH = (v / max) * h;
      ctx.fillRect(i * barW, h - barH, barW * 0.8, barH);
    });
  }, [points]);

  return <canvas ref={canvasRef} width={300} height={150} />;
}