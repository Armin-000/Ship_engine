
/* =========================================================
   LOGIN SCREEN
========================================================= */

*,
*::before,
*::after {
  box-sizing: border-box;
}

.login-screen {
  position: fixed;
  inset: 0;
  z-index: 999999;

  display: grid;
  grid-template-columns: 60% 40%;

  background: #080808;
}

.login-shell {
  width: 100%;
  height: 100%;
  display: contents;
}

/* LEFT LOGIN PANEL */

.login-left {
  position: relative;
  overflow: hidden;

  height: 100vh;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  padding: clamp(40px, 6vw, 100px);

  background: #0d0d0d;
  color: #fff;
}

.login-left::before {
  content: "";

  position: absolute;
  inset: 0;

  background-image:
    linear-gradient(
      rgba(255,255,255,.04) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(255,255,255,.04) 1px,
      transparent 1px
    );

  background-size: 42px 42px;

  pointer-events: none;
}

.login-left::after {
  content: "";

  position: absolute;
  top: 0;
  right: 0;

  width: 120px;
  height: 100%;

  background: linear-gradient(
    to right,
    transparent,
    rgba(0,0,0,.55)
  );

  pointer-events: none;
}

.login-left > * {
  position: relative;
  z-index: 1;

  width: 100%;
  max-width: 420px;
}

/* RIGHT IMAGE PANEL */

.login-right {
  position: relative;
  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: clamp(22px, 3vw, 48px);

  background: #050505;
}

.login-right::before {
  content: "";
  position: relative;

  width: 100%;
  height: 88%;

  border-radius: 34px;

  background:
    linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.35)),
    url("/images/2.webp");

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  border: 1px solid rgba(255,255,255,.14);

  filter: saturate(.95) contrast(1.04);
}

.login-right::after {
  content: "";
  position: absolute;
  inset: 0;

  background:
    radial-gradient(
      circle at center,
      rgba(143,228,207,.08),
      transparent 58%
    );

  pointer-events: none;
}

/* LOGIN TEXT */

.login-title {
  margin: 0 0 12px;

  font-size: clamp(42px, 5vw, 74px);
  line-height: .95;
  font-weight: 950;

  color: #fff;
  text-align: center;
}

.login-subtitle {
  margin: 0 0 48px;

  color: rgba(255,255,255,.65);

  font-size: 16px;
  font-weight: 500;
  text-align: center;
}

/* LOGIN FORM */

.login-field {
  display: block;
  margin-bottom: 20px;
}

.login-field span {
  display: block;
  margin-bottom: 10px;

  color: rgba(255,255,255,.75);

  font-size: 13px;
  font-weight: 800;
}

.login-field input {
  width: 100%;
  height: 52px;

  padding: 0 16px;

  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);

  background: #141414;
  color: #fff;

  outline: none;

  font-size: 15px;
  font-weight: 600;

  transition: border-color .2s ease;
}

.login-field input:focus {
  border-color: rgba(117,232,255,.6);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 56px;
}

#togglePassword {
  position: absolute;
  top: 50%;
  right: 10px;

  transform: translateY(-50%);

  width: 36px;
  height: 36px;

  border: none;
  border-radius: 8px;

  background: transparent;
  color: rgba(255,255,255,.8);

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
}

#togglePassword:hover {
  background: rgba(255,255,255,.05);
}

#togglePassword svg {
  width: 18px;
  height: 18px;
}

.login-submit {
  width: 100%;
  height: 54px;

  margin-top: 8px;

  border: none;
  border-radius: 12px;

  background: #8fe4cf;
  color: #07110d;

  font-size: 15px;
  font-weight: 900;

  cursor: pointer;

  transition:
    background .2s ease,
    transform .2s ease;
}

.login-submit:hover {
  background: #9ff3de;
  transform: translateY(-1px);
}

.login-error {
  margin-top: 18px;
  min-height: 22px;

  text-align: center;

  color: #ff6565;
  font-size: 14px;
  font-weight: 700;
}

/* BETA LABEL */

.login-beta {
  position: absolute;

  left: 24px;
  bottom: 24px;

  color: rgba(255,255,255,.35);

  font-size: 12px;
  font-weight: 600;

  letter-spacing: .12em;
  text-transform: uppercase;
}

/* MOBILE LOGIN */

@media (max-width: 900px) {
  .login-screen {
    grid-template-columns: 1fr;
    grid-template-rows: 50vh 50vh;
  }

  .login-left {
    height: 50vh;

    padding: 24px;

    border-right: none;
  }

  .login-left > * {
    max-width: 420px;
  }

  .login-title {
    font-size: 42px;
  }

  .login-right {
    display: flex;
    height: 50vh;

    padding: 16px;
  }

  .login-right::before {
    width: 100%;
    height: 100%;

    border-radius: 24px;
  }

  .login-beta {
    left: 16px;
    bottom: 12px;

    font-size: 10px;
  }
}

/* INITIAL HIDDEN STATE */

.login-screen,
#viewer {
  display: none;
}