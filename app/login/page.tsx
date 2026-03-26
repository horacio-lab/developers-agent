"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async () => {
    setLoading(true); setError("");
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #F5F2EE;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Blobs de fondo */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          pointer-events: none;
        }
        .blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #c8dff7 0%, #dbeafe 60%, transparent 100%);
          top: -140px; left: -120px;
        }
        .blob-2 {
          width: 440px; height: 440px;
          background: radial-gradient(circle, #fde8cc 0%, #fef3c7 60%, transparent 100%);
          bottom: -100px; right: -80px;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #d1fae5 0%, #ecfdf5 60%, transparent 100%);
          bottom: 60px; left: 10%;
        }

        /* Tarjeta glassmorphism */
        .glass-card {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 24px;
          padding: 44px 40px;
          width: 100%;
          max-width: 420px;
          box-shadow:
            0 8px 32px rgba(37, 99, 168, 0.08),
            0 2px 8px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        /* Logo */
        .logo-area {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #0f2240 0%, #1a4d8a 60%, #1a7a8a 100%);
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 4px 16px rgba(37,99,168,.28);
        }
        .logo-text {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 26px;
          color: #1a1510;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }
        .logo-sub {
          font-size: 13px;
          color: #7a6f64;
          line-height: 1.5;
        }
        .logo-sub span {
          color: #15803d;
          font-weight: 600;
        }

        /* Botón Google */
        .btn-google {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid rgba(234, 229, 223, 0.9);
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1510;
          cursor: pointer;
          margin-bottom: 20px;
          transition: all 0.18s ease;
          backdrop-filter: blur(8px);
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .btn-google:hover {
          background: rgba(255,255,255,0.95);
          border-color: #c8dff7;
          box-shadow: 0 2px 12px rgba(37,99,168,.1);
          transform: translateY(-1px);
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(234,229,223,0.8);
        }
        .divider-txt {
          font-size: 11px;
          color: #a09888;
          white-space: nowrap;
        }

        /* Inputs */
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 14px;
        }
        .input-field {
          padding: 12px 14px;
          border-radius: 11px;
          border: 1.5px solid rgba(234,229,223,0.9);
          background: rgba(255,255,255,0.7);
          font-size: 14px;
          color: #1a1510;
          outline: none;
          transition: all 0.18s ease;
          backdrop-filter: blur(8px);
          font-family: inherit;
          width: 100%;
        }
        .input-field::placeholder { color: #c0b8ae; }
        .input-field:focus {
          border-color: #93c5fd;
          background: rgba(255,255,255,0.9);
          box-shadow: 0 0 0 3px rgba(37,99,168,.08);
        }

        /* Error */
        .error-box {
          margin-bottom: 14px;
          padding: 10px 14px;
          background: rgba(255, 247, 237, 0.9);
          border: 1px solid #FED7AA;
          border-radius: 9px;
          font-size: 13px;
          color: #c2410c;
          backdrop-filter: blur(8px);
        }

        /* Botón principal */
        .btn-primary {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #0f2240 0%, #1a4d8a 60%, #1a7a8a 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 4px 20px rgba(37,99,168,.3);
          letter-spacing: .02em;
          font-family: inherit;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(37,99,168,.38);
        }
        .btn-primary:disabled {
          background: #d4cfc8;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Toggle */
        .toggle-txt {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #7a6f64;
        }
        .toggle-link {
          color: #2563a8;
          cursor: pointer;
          font-weight: 600;
          text-decoration: none;
        }
        .toggle-link:hover { text-decoration: underline; }

        /* Badge créditos gratis */
        .badge-free {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(220, 252, 231, 0.8);
          border: 1px solid #bbf7d0;
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #15803d;
          margin-top: 8px;
          backdrop-filter: blur(4px);
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
          display: inline-block;
        }

        /* Footer */
        .footer-txt {
          text-align: center;
          margin-top: 28px;
          font-size: 11px;
          color: #c0b8ae;
          line-height: 1.6;
        }
      `}</style>

      <div className="login-root">
        {/* Blobs de fondo */}
        <div className="blob blob-1"/>
        <div className="blob blob-2"/>
        <div className="blob blob-3"/>

        <div className="glass-card">

          {/* Logo */}
          <div className="logo-area">
            <div className="logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#5ea8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="logo-text">unearth</div>
            <div className="logo-sub">
              {isRegister
                ? <>Análisis inmobiliario inteligente</>
                : <>Bienvenido de vuelta</>
              }
            </div>
            {isRegister && (
              <div style={{display:"flex",justifyContent:"center"}}>
                <div className="badge-free">
                  ✦ 1 reporte completo gratis al registrarte
                </div>
              </div>
            )}
          </div>

          {/* Google */}
          <button className="btn-google" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="divider">
            <div className="divider-line"/>
            <span className="divider-txt">o con email</span>
            <div className="divider-line"/>
          </div>

          {/* Inputs */}
          <div className="input-group">
            <input
              className="input-field"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="input-field"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailAuth()}
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button
            className="btn-primary"
            onClick={handleEmailAuth}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner"/> Cargando…</>
              : isRegister ? "Crear cuenta gratis" : "Entrar"
            }
          </button>

          <div className="toggle-txt">
            {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <span
              className="toggle-link"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
            >
              {isRegister ? "Inicia sesión" : "Regístrate gratis"}
            </span>
          </div>

          <div className="footer-txt">
            Al continuar aceptas nuestros términos de uso.<br/>
            Tus datos están seguros y encriptados.
          </div>

        </div>
      </div>
    </>
  );
}