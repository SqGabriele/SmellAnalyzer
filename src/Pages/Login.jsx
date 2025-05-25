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
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [seePassword, setSeePassword] = useState("");
  const [seeConfirmPassword, setSeeConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

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
      if (isRegistering) {  //registrazione
        if(email.includes("/"))
          throw new Error('The character "/" is not allowed');
        else if(email.includes("@"))
          throw new Error('The character "@" is not allowed');
        await createUserWithEmailAndPassword(auth, email+"@smell.com", password);
      } 
      else if (email.includes("/")){  //login come teamleader
        return handleSubmitTeam();
      }
      else {  //login amministratore
        await signInWithEmailAndPassword(auth, email+"@smell.com", password);
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
  const handleSubmitTeam = async () => {
    setError("");

    try {
      const db = getFirestore();
      const name = email.split("/");
      const docRef = doc(db, "TeamAccounts", name[0]+"@smell.com");
      const docSnap = await getDoc(docRef);
      let uid=null;

      if (docSnap.exists()) {
          const savedData = docSnap.data();
          if(!savedData.teams.some(team => team.name === name[1] && team.password === password))
            throw new Error("Auth Error");
          uid = savedData.uid;
      } 
      else 
        throw new Error("Auth Error");

      const userInfo = [uid, name[1]];
      localStorage.setItem("POuid", JSON.stringify(userInfo));
      setUid(userInfo);
      await signOut(auth);
      navigate("/graph");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isRegistering ? "Sign Up" : "Login"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="User"
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
    </div>
  );
}
