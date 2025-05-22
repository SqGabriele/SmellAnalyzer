import { useEffect, useState } from "react";
import {signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { Icon } from '@iconify/react';
import "../style.css";

export function Login({setUid}) {
  //nota: email2, password2 ... fanno riferimento al login come team leader
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [seePassword, setSeePassword] = useState("");
  const [seePassword2, setSeePassword2] = useState("");
  const [seeConfirmPassword, setSeeConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [error2, setError2] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [teamName, setTeamName] = useState("");

  useEffect(() =>{
    localStorage.setItem("POuid", null);
    setUid(null);
  },[]);

  //colore pagina
  useEffect(() => {
    const previousColor = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#0D6EFD";

    return () => {
      document.body.style.backgroundColor = previousColor; // reset quando si lascia la pagina
    };
  } , []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/graph");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    try {
      await signOut(auth);
      navigate("/graph");
    } catch (err) {
      setError(err.message);
    }
  };

  //per i teamLeader
  const handleSubmitTeam = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const db = getFirestore();
      const docRef = doc(db, "TeamAccounts", email2);
      const docSnap = await getDoc(docRef);
      let uid=null;

      if (docSnap.exists()) {
          const savedData = docSnap.data();
          if(!savedData.teams.some(team => team.name === teamName && team.password === password2))
            throw new Error("Auth Error");
          uid = savedData.uid;
      } 
      else 
        throw new Error("Auth Error");

      const userInfo = [uid, teamName];
      localStorage.setItem("POuid", JSON.stringify(userInfo));
      setUid(userInfo);
      await signOut(auth);
      navigate("/graph");
    } catch (err) {
      setError2(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isRegistering ? "Sign Up" : "Login"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          {/*password login*/}
          <div className="password-container">
            <input
            type= {seePassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
            />
            <span onClick={() => setSeePassword(!seePassword)} className="login-eye-icon">
                <Icon
                    icon={seePassword ? "heroicons-solid:eye-slash" : "heroicons-solid:eye"}
                    className="eye"
                />
            </span>
          </div>
          {isRegistering && (
            <div className="password-container">
              {/*confirm password*/}
              <input
                type= {seeConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="login-input"
              />
              <span onClick={() => setSeeConfirmPassword(!seeConfirmPassword)} className="login-eye-icon">
                <Icon
                    icon={seeConfirmPassword ? "heroicons-solid:eye-slash" : "heroicons-solid:eye"}
                    className="eye"
                />
              </span>
            </div>
          )}
          <button type="submit" className="login-button">
            {isRegistering ? "Sign Up" : "Login"}
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="guest-button"
          >
            Continue as Guest
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="switch-text">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
              setConfirmPassword("");
            }}
            className="switch-button"
          >
            {isRegistering ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>

      {/*Login come team leader */}
      <div className="login-box">
        <h2>Login as Team Leader</h2>
        <form onSubmit={handleSubmitTeam}>
          <input
            type="email"
            placeholder="Email"
            value={email2}
            onChange={(e) => setEmail2(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="text"
            placeholder="Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            className="login-input"
          />
          <div className="password-container">
            <input
              type= {seePassword2 ? "text" : "password"}
              placeholder="Password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="login-input"
            />
            <span onClick={() => setSeePassword2(!seePassword2)} className="login-eye-icon">
                <Icon
                    icon={seePassword2 ? "heroicons-solid:eye-slash" : "heroicons-solid:eye"}
                    className="eye"
                />
              </span>
          </div>
          <button type="submit" className="login-button">Login</button>

          {error2 && <p className="error-text">{error2}</p>}
        </form>
      </div>
    </div>
  );
}
