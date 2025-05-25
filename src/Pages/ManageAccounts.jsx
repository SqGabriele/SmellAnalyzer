import { Link, useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import { useState, useEffect,useRef } from "react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { signOut, getAuth, onAuthStateChanged} from "firebase/auth";
import { getFirestore, setDoc, doc, getDoc } from "firebase/firestore";
import "../style.css";

export function ManageAccounts() {
    const navigate = useNavigate();
    const location = useLocation();
    const data = location.state?.data;
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const [deleteIndex, setDeleteIndex] = useState(null);
    const [teams, setTeams] = useState([]);
    const [newTeam, setNewTeam] = useState({ name: "", password: "", show: false });
    const [modified, setModified] = useState(false); //mostra il pulsante di salvataggio
    const name = useRef(auth.currentUser.email.split("@")[0]);

    //ricarica i dati
    useEffect(() => {
        const auth = getAuth();
        const db = getFirestore();

        const load = onAuthStateChanged(auth, async (user) => {
            if(user){
                const docRef = doc(db, "TeamAccounts",  auth.currentUser.email);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const savedData = docSnap.data();
                    setTeams(savedData.teams.map(({ name, password }) => ({ name, password, show:false })))
                }
            }
        });

        return () => load();
    }, [data]);

    const handleLogout = async () => {
        try {
          await signOut(auth);
          navigate("/"); // Torna alla pagina di login
        } catch (err) {
          console.error("Logout failed:", err);
        }
      };

    const handlePasswordChange = (index, newPassword) => {
        setModified(true);
        const updated = [...teams];
        updated[index].password = newPassword;
        setTeams(updated);
    };

    const handleToggleShow = (index) => {
        const updated = [...teams];
        updated[index].show = !updated[index].show;
        setTeams(updated);
    };

    const handleAddTeam = () => {
        setModified(true);
        if (newTeam.name.trim() && newTeam.password.trim()) {
            const updated = [...teams, { ...newTeam }];
            setTeams(updated);
            setNewTeam({ name: "", password: "", show: false });
        }
    };

    const handleDelete = () => {
        setModified(true);
        const updated = teams.filter((_, i) => i !== deleteIndex);
        setTeams(updated);
        setDeleteIndex(null);
    };

    const uploadToDatabase = async(newTeam) => {
        setModified(false);
        const auth = getAuth();
        const db = getFirestore();
        const user = auth.currentUser;

        if(!user){
            return;
        }
        const dataToSave = {
            teams: newTeam.map(({ name, password }) => ({ name, password })),
            savedAt: new Date(),
            email: auth.currentUser.email,
            uid: auth.currentUser.uid,
        };
        try {
            await setDoc(doc(db, "TeamAccounts", auth.currentUser.email), dataToSave);
        } catch (error) {
            console.error("File failed to upload:", error);
        }
    }

    return (
        <div>
            {/*topbar*/}
            <div className="topnav">
                <button onClick={() => setLogoutDialogOpen(true)} className="logout" title="Logout" style={{left: "20px"}}>
                    <Icon icon="heroicons-solid:arrow-left-on-rectangle" width="30" height="30"/>
                </button>
                {/*Link alle altre viste */}
                <div className="links">
                    <div style={{color:'#a0a0a0'}}><Icon icon="heroicons-solid:user-plus" /></div>
                    <div><Link to="/graph" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:rectangle-group" /></Link></div>
                    <div><Link to="/smellsPriority" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:table-cells" /></Link></div>
                    <div><Link to="/refactoring" style={{color:'#ffffff'}} state={{ data:  data}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></Link></div>
                </div>
            </div>
            <br/><br/><br/><br/>


            {/*Account Manager*/}
            <div className="team-manager-container">
                <h2 className="team-title">Team Manager</h2>

                <div className="team-list">
                    {teams.map((team, index) => (
                    <div className="team-entry" key={index}>
                        <span className="team-name">{name.current}/{team.name}</span>
                        <input
                        type={team.show ? "text" : "password"}
                        value={team.password}
                        onChange={(e) => handlePasswordChange(index, e.target.value)}
                        className="team-password"
                        />
                        <span onClick={() => handleToggleShow(index)} className="eye-icon">
                            <Icon
                                icon={team.show ? "heroicons-solid:eye-slash" : "heroicons-solid:eye"}
                                className="eye"
                            />
                        </span>
                        <button className="remove-button" onClick={() => setDeleteIndex(index)}>
                            <Icon icon="heroicons-solid:x-circle" className="remove-icon" />
                        </button>
                    </div>
                    ))}

                    {/*new entry */}
                    <div className="team-entry">
                    <select
                        type="text"
                        placeholder="Select Team"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className="team-name-input"
                    >   
                        <option value={null}>Select a Team</option>
                        {
                            (Object.keys(data?.teamColors) || []).map( teamName=>
                                <option key={teamName} value={teamName}>{teamName}</option>
                            )
                        }
                    </select>
                    <input
                        type={newTeam.show ? "text" : "password"}
                        placeholder="Password"
                        value={newTeam.password}
                        onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                        className="team-password"
                    />
                    <span onClick={() => setNewTeam({ ...newTeam, show: !newTeam.show })} className="eye-icon">
                        <Icon
                        icon={newTeam.show ? "heroicons-solid:eye-slash" : "heroicons-solid:eye"}
                        className="eye"
                        />
                    </span>
                    <button onClick={handleAddTeam} className="add-button">+</button>
                    </div>
                </div>
                {modified && (
                    <div className="save-reminder-bar">
                        <div className="save-reminder-text"><b>Upload changes</b></div>
                        <button
                        className="save-reminder-button"
                        onClick={() => uploadToDatabase(teams)}
                        >
                            <Icon icon="heroicons-solid:arrow-up-tray" width="20" height="20" />
                        </button>
                    </div>
                )}
            </div>
            
            {/*dialog di conferma logout */}
            {logoutDialogOpen && (
            <div className="confirm-dialog-overlay">
                <div className="confirm-dialog">
                <div className="confirm-dialog-message">
                    Do you really want to log out?
                </div>
                <hr style={{width:"100%"}}/><br/>
                <div className="confirm-buttons">
                    <button className="confirm-button-yes" onClick={handleLogout}>Yes</button>
                    <button className="confirm-button-no" onClick={() => setLogoutDialogOpen(false)}>No</button>
                </div>
                </div>
            </div>
            )}
            {/*dialog di conferma delete */}
            {deleteIndex !== null && (
            <div className="confirm-dialog-overlay">
                <div className="confirm-dialog">
                <div className="confirm-dialog-message">
                    Do you really want to delete this account?
                </div>
                <hr style={{width:"100%"}}/><br/>
                <div className="confirm-buttons">
                    <button className="confirm-button-yes" onClick={handleDelete}>Yes</button>
                    <button className="confirm-button-no" onClick={() => setDeleteIndex(null)}>No</button>
                </div>
                </div>
            </div>
            )}
        </div>
    );
}