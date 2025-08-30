// src/components/devices/DeviceLink.jsx
import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/* 프론트만:
   - 오프라인 임의 등록(로컬)
   - 온라인 등록 시 서버로 6필드 전송(JSON, image_base64)
   - 등록 즉시 갤러리에 보이도록 thumbs/meta/client_devices 갱신 + 이벤트 브로드캐스트
*/

// ----- 로컬스토리지 유틸 (대시보드와 동일 규칙) -----
const safeJSON = (v, d) => {
  try {
    const parsed = JSON.parse(v);
    return parsed === null ? d : parsed; // "null" 문자열 정리
  } catch {
    return d;
  }
};
const read = (k, d) =>
  typeof window === "undefined" ? d : safeJSON(localStorage.getItem(k), d);
const write = (k, v) => {
  if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v));
};

// ▶ 대시보드와 동일한 FNV-1a + 36진수 해시
const hashStr = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};
const userKeyFromToken = (t) => (t ? hashStr(String(t)) : "guest");
function keysFor(token) {
  const h = userKeyFromToken(token);
  return {
    CLIENT: `greeneye_client_devices:${h}`,
    THUMBS: `greeneye_thumbs:${h}`,
    META: `greeneye_meta:${h}`,
    DEL: `greeneye_deleted:${h}`, // 읽기만
    LEGACY: "greeneye_devices",
  };
}
function upsertClientDev(token, dev) {
  const { CLIENT } = keysFor(token);
  const arr = read(CLIENT, []);
  const key = String(dev.deviceCode || dev.device_id || "").trim();
  const map = new Map(arr.map((d) => [String(d.deviceCode || d.device_id || "").trim(), d]));
  if (key) map.set(key, { ...(map.get(key) || {}), ...dev });
  write(CLIENT, [...map.values()]);
}
function writeThumb(token, code, dataUrl) {
  const { THUMBS } = keysFor(token);
  const m = read(THUMBS, {});
  if (code && dataUrl) {
    m[code] = dataUrl;
    write(THUMBS, m);
  }
}
function writeMeta(token, code, meta) {
  const { META } = keysFor(token);
  const m = read(META, {});
  if (code) {
    m[code] = { ...(m[code] || {}), ...(meta || {}) };
    write(META, m);
  }
}
const broadcast = () => window.dispatchEvent(new CustomEvent("greeneye:client-devices-updated"));

// ----- 입력/이미지 유틸 -----
const SPECIES_FALLBACK = [
  "팬지 / 삼색제비꽃 (Pansy)","비올라 (Viola)","메리골드 / 금잔화 (Calendula)","코스모스 (Cosmos)","백일홍 (Zinnia)",
  "봉선화 (Impatiens)","나팔꽃 (Morning glory)","샐비어 / 깨꽃 (Salvia)","루드베키아 (Rudbeckia)","페튜니아 (Petunia)",
  "데이지 (Bellis perennis)","스위트앨리섬 (Sweet alyssum)","스토크 (Stock)","시클라멘 (Cyclamen)","호스타 (Hosta)",
  "제라늄 (Geranium)","애기범부채 (Iris domestica)","가자니아 (Gazania)","라벤더 (Lavender)","에키나시아 (Echinacea)",
  "장미 (Rose)","수국 (Hydrangea)","영산홍/철쭉 (Royal Azalea)","목련 (Magnolia)","무궁화 (Hibiscus syriacus)",
  "라일락 (Lilac)","유채나무 (Forsythia)","진달래 (Rhododendron)","칼리카르파 (Callicarpa)","개나리 (Forsythia koreana)",
  "안스리움 (Anthurium)","베고니아 (Begonia)","아젤리아 (Azalea in pots)","파키라 (Pachira)","드라세나 (Dracaena)",
  "거베라 (Gerbera)","알스트로메리아 (Alstroemeria)","선인장류 (Cactus family)","알로에 (Aloe)","에케베리아 (Echeveria)",
  "하월시아 (Haworthia)","세덤 / 돌나물 (Sedum)","칼랑코에 (Kalanchoe)","튤립 (Tulip)","수선화 (Narcissus)",
  "히야신스 (Hyacinth)","프리지아 (Freesia)","글라디올러스 (Gladiolus)","아마릴리스 (Amaryllis)","크로커스 (Crocus)",
  "다알리아 (Dahlia)","칼라 (Zantedeschia)","국화 (Chrysanthemum)","백합 (Lily)","카네이션 (Carnation)",
  "해바라기 (Sunflower)","스파티필룸 (Spathiphyllum)","아글라오네마 (Aglaonema)","디펜바키아 (Dieffenbachia)",
  "몬스테라 (Monstera)","산세베리아 (Sansevieria)","테이블야자 (Parlor palm)","페페로미아 (Peperomia)",
  "벵갈고무나무 (Ficus elastica)","싱고니움 (Syngonium)","칼라디움 (Caladium)","바질 (Basil)","로즈마리 (Rosemary)",
  "타임 / 벼룩이자리 (Thyme)","오레가노 (Oregano)","민트 / 배초향 (Korean Mint)","카모마일 / 카밀레 (Chamomile)","안개꽃 (Gypsophila)"
];

function toMacNorm(v) {
  const s = String(v || "").trim().toUpperCase();
  const hex = s.replace(/[^0-9A-F]/g, "");
  const tail = hex.slice(-4);
  return tail ? `ge-sd-${tail.toLowerCase()}` : "";
}
const isValidGeSd = (v) => /^ge-sd-[0-9a-f]{4}$/.test(String(v || ""));

async function fileToDataURL(file) {
  if (!file) return null;
  await new Promise((r) => setTimeout(r));
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("file read error"));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsDataURL(file);
  });
}
async function makeThumb(file, maxW = 640, maxH = 360) {
  const dataURL = await fileToDataURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataURL;
  });
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * scale),
    h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.85);
}
function makeTextThumb(text, w = 640, h = 360) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#111";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#10b981";
  x.font = "bold 56px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("GreenEye", w / 2, h / 2 - 24);
  x.fillStyle = "#fff";
  x.font = "24px system-ui, sans-serif";
  x.fillText(String(text || "device").toUpperCase(), w / 2, h / 2 + 28);
  return c.toDataURL("image/jpeg", 0.9);
}

// ----- 컴포넌트 -----
export default function DeviceLink({ speciesOptions }) {
  const navigate = useNavigate();
  const { authFetch, token } = useContext(AuthContext) || {};

  // 폼 상태
  const [name, setName] = useState("");
  const [macInput, setMacInput] = useState("");
  const [room, setRoom] = useState("");
  const [species, setSpecies] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 이메일(로그인 시 저장)
  const email =
    (typeof window !== "undefined" &&
      (localStorage.getItem("account_email") || "")) ||
    "";

  // 기존에 'null' 문자열로 저장된 키 정리
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { THUMBS, META, CLIENT } = keysFor(token);
    if (localStorage.getItem(THUMBS) === "null") localStorage.removeItem(THUMBS);
    if (localStorage.getItem(META) === "null") localStorage.removeItem(META);
    if (localStorage.getItem(CLIENT) === "null") localStorage.removeItem(CLIENT);
  }, [token]);

  // 종 목록
  const spList = useMemo(() => {
    if (Array.isArray(speciesOptions) && speciesOptions.length) return speciesOptions;
    if (typeof window !== "undefined" && Array.isArray(window.SPECIES_74)) return window.SPECIES_74;
    return SPECIES_FALLBACK;
  }, [speciesOptions]);

  // 파일 선택
  const onPickFile = async (f) => {
    setFile(f || null);
    if (!f) return setPreview("");
    try {
      setPreview(await makeThumb(f));
    } catch {
      setPreview("");
    }
  };

  const ensureThumb = async (code) => {
    if (preview) return preview;
    if (file) {
      try {
        return await makeThumb(file);
      } catch {}
    }
    return makeTextThumb(code);
  };

  // sendRegister 함수를 수정, FormData를 받도록 변경
  async function sendRegister(formData) {
    const res = await (authFetch
      ? authFetch("/api/register_device", {
          method: "POST",
          body: formData,
        })
      : fetch((import.meta.env.VITE_API_BASE || "") + "/api/register_device", {
          method: "POST",
          body: formData,
          credentials: "include",
        }));
    if (!res.ok) throw new Error(`register_device failed: ${res.status}`);
    return res.json().catch(() => ({}));
  }

  // 제출
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const mac = toMacNorm(macInput);
      if (!name.trim()) throw new Error("기기 이름을 입력하세요.");
      if (!isValidGeSd(mac))
        throw new Error("장치 아이디는 ge-sd-xxxx 형식이어야 합니다.");

      const deviceCode = mac; // 정규형 그대로
      const img = await ensureThumb(mac);

      // FormData 객체 생성
      const formData = new FormData();
      formData.append("mac_address", mac);
      formData.append("friendly_name", name.trim());
      formData.append("room", room);
      formData.append("species", species); // 백엔드 필드명과 맞춤

      if (file) {
        formData.append("image", file); // 파일 자체를 전송
      } else {
        // 이미지가 없을 경우, `image_base64` 필드로 대체
        formData.append("image_base64", makeTextThumb(mac));
      }

      // 서버 전송
      await sendRegister(formData);

      // 로컬 스토리지에 데이터 저장
      writeThumb(token, deviceCode, img);
      writeMeta(token, deviceCode, { species, room, ownerEmail: email });
      upsertClientDev(token, {
        deviceCode,
        name: name.trim(),
        imageUrl: img,
        species,
        room,
      });
      broadcast();
      
      alert("기기 연결 성공!");
      navigate("/dashboard", {
        replace: true,
        state: { addedDevice: { deviceCode } },
      });
    } catch (e2) {
      setErr(e2.message || "등록 실패");
    } finally {
      setLoading(false);
    }
  };

  // ----- UI -----
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "var(--ge-bg)",
        padding: "32px 12px",
      }}
    >
      <form
       id="device-link-form"
        onSubmit={onSubmit}
        style={{
         width: 640,
        maxWidth: "100%",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        padding: 24,
        color: "#111",
      }}
>

        <h1 style={{ fontSize: 28, margin: "4px 0 18px", fontWeight: 800 }}>
          기기 연결 + 사진 등록
        </h1>

        {err && (
          <div
            style={{
              color: "#b91c1c",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              padding: "8px 10px",
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            {err}
          </div>
        )}

        {/* 기기 이름 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>기기 이름</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: GreenEye_01"
            className="form-input"
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          />
        </div>

        {/* MAC / 장치 ID */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>MAC / 장치 ID</div>
          <input
            value={macInput}
            onChange={(e) => setMacInput(e.target.value)}
            placeholder="예: GE-SD-6C18"
            className="form-input"
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          />
        </div>

        {/* 방(Room) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>방(Room)</div>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="예: 거실 / 베란다 / 침실"
            className="form-input"
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          />
        </div>

        {/* 식물종 (드롭다운 전용) */}
        <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>식물종(Species)</div>
        <select
        value={species}
        onChange={(e) => setSpecies(e.target.value)}
        style={{
        width: "100%",
        padding: "12px 14px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
        }}
      >
        <option value="" disabled>식물종을 선택하세요</option>
        {spList.map((sp) => (
          <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>
      </div>

        {/* 등록 사진 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>등록 사진</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* 미리보기 박스 */}
        <div
          style={{
            height: 160,
            border: "1px dashed #cbd5e1",
            background: "#fafafa",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="preview"
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ color: "#9ca3af" }}>선택된 이미지가 없습니다.</div>
          )}
        </div>

        {/* 액션 버튼 */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            background: loading ? "#93c5fd" : "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
         {loading ? "등록 중…" : "기기 등록"}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 10,
            background: "#e5e7eb",
            color: "#111",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          돌아가기
        </button>
      </form>
    </div>
  );
}