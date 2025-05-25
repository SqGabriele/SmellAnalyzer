import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import { useNavigate } from "react-router-dom";
import { signOut, getAuth } from "firebase/auth";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import { auth } from "../firebase";
import React from "react";
import Select from "react-select";
import ReactSlider from "react-slider";
import "../style.css";

export function SecondView({page, setPage, POuid}) {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.data || {};

  const priorityLevels = ["High", "Medium to High", "Medium", "Low to Medium", "Low", "None to Low", "None"];
  const effortLevels = ["High effort", "Medium effort", "Low effort"];

  //smells recuperati dai dati
  const [service, setService] = useState(data.services || []);
  const smellList = useRef(data.currentSmells);
  const [selectedTeams, setSelectedTeams] = useState(data.teamAffected || []); //per la prospettiva
  const [hoveredSmell, setHoveredSmell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [urgency, setUrgency] = useState(data.urgency);
  const [effort, setEffort] = useState(data.effort);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  //naviga grazie al chatbot
  useEffect(() => {
    if (!page.done) {
      const d = { ...updateData() };
      if (page.type === "effort") d.effort = page.content;
      else if (page.type === "urgency") d.urgency = page.content;
      else if (page.type === "team" && (data.teamColors[page.content] || page.content === "all")){
        if(page.content !== "all")
          d.teamAffected = [{value: page.content, label: page.content}];
        else 
          d.teamAffected =(Object.keys(data.teamColors).map((team) => ({ value: team, label: team })));
        if(page.page === 1)
          d.checkboxOption = false;
      }
      else if (page.type === "teamAdd" && (data.teamColors[page.content])){
        d.teamAffected = selectedTeams;
        d.teamAffected.push({ value: page.content, label: page.content });
        d.checkboxOption = false;
      }
      else if(page.type === "team_interaction")
        d.checkboxOption = true;
      else if(page.type === "generating_node" || page.type === "generating_link" || page.type === "remove_link" || page.type === "remove_service" || page.type==="suggest")
        setPage(prev => ({ ...prev, doneAsync: false }));
      
      if (page.page === 1) {
        navigate("/graph", { state: { data: d } });
      }
      else if (page.page === 3) 
        navigate("/refactoring", { state: { data: d } });
  
      setPage(prev => ({ ...prev, done: true }));
    }
  }, [page]);

  //aumenta o diminuisce l'effort
  const updateEffort = (serviceIndex, smellIndex, refactorIndex, increment) => {
    setHoveredSmell(null);
    setService((prevService) => {
      const newService = [...prevService];
      const updatedSmell = newService[serviceIndex].smellsInstances[smellIndex];

      const smellName = newService[serviceIndex].smellsInstances[smellIndex].smell;
      const refact = smellList.current[smellName].refactoring[refactorIndex];
      
      //calcolo il nuovo valore dell'effort
      let val = effortLevels.indexOf(updatedSmell.effort[refact]);
      val = val + increment;
      if (val < 0) val = 2;
      else if (val > 2) val = 0;
  
      //aggiorna l'effort
      updatedSmell.effort[refact] = effortLevels[val];
  
      return newService;
    });
    setTimeout(() => {saveOnCloud();},0);
  };

  //salva in cloud
  const saveOnCloud = async() =>{
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
  
    const userId = user!==null ? user.uid : POuid[0];
    const dataToSave = {
      services: data.services,
      teamColors: data.teamColors,
      arcs: data.arcs.map(x => ({from: { name: x[0].name, key: x[0].key }, to: { name: x[1].name, key: x[1].key }})),
      savedAt: new Date(),
      uid: userId
    };
    try {
      await setDoc(doc(db, "Saves", userId), dataToSave);
    } catch (error) {
      console.error("File failed to upload:", error);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Torna alla pagina di login
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  //calcola i team che coinvolge uno smell
  const affectedTeam = (hoveredSmell) => {
    return new Set([
      ...data.arcs
      .filter(arc => arc[0]?.name === hoveredSmell.name && arc[1]?.team !== hoveredSmell.team) 
      .map(arc => arc[1].team)])
  }

  const alreadyPlaced = (serviceSmells, refactoring, smell) =>{
    const stringToInt = (string) =>{
      switch(string){
        case "None": return 0;
        case "None to Low": return 1;
        case "Low": return 2;
        case "Low to Medium": return 3;
        case "Medium": return 4;
        case "Medium to High": return 5;
        case "High": return 6;
      }
    }
    return serviceSmells.some((x) => //se nello stesso servizio uno smell ha lo stesso refactoring ed ha un impatto maggiore (oppure stesso impatto ma sono diversi)
      {
        const a = smellList.current[x.smell].refactoring.includes(refactoring);
        let b;
        if(x.impact !== smell.impact) //prendo il più grande
          b = stringToInt(x.impact) > stringToInt(smell.impact);
        else //ne prendo uno 
          b = x.smell > smell.smell
        return a && b;
      }
    )
  }

  const checkPriority = (priorityIndex) =>{
    return !(priorityIndex < urgency[0] || priorityIndex > urgency[1]);
  }

  const checkEffort = (EffortIndex) =>{
    if(EffortIndex == 3) return true; // to define
    return !(EffortIndex < effort[0] || EffortIndex > effort[1]);
  }

  const updateData = () =>{
    data.teamAffected = selectedTeams;
    data.urgency = urgency;
    data.effort = effort;
    return data;
  }

  //controlla ci siano refactor da definire
  const undefinedEffortItems = [];
  service.forEach((r, serviceIndex) => {
    r.smellsInstances.forEach((smell, smellIndex) => {
      const refactors = smellList.current[smell.smell].refactoring;
      refactors.forEach((refact, refactorIndex) => {
        if (smell.effort[refact] === "To define" && selectedTeams.some(team => team.value === r.team)) {
          if (!alreadyPlaced(r.smellsInstances, refact, smell)) {
            undefinedEffortItems.push({ serviceIndex, smellIndex, refactorIndex, r, smell, refact });
          }
        }
      });
    });
  });
  const noUndefinedEfforts = undefinedEffortItems.length === 0;

  return (
    <div>
      {/*topbar*/}
      <div className="topnav">
        <button onClick={() => setLogoutDialogOpen(true)} className="logout" title="Logout" style={{left: "20px"}}>
            <Icon icon="heroicons-solid:arrow-left-on-rectangle" width="30" height="30"/>
        </button>
        {/*Link alle altre viste */}
        <div className="links">
          {/*solo se sono loggato*/}
          {auth.currentUser && 
            <div> <Link to="/manageAccounts" style={{color:'#ffffff'}} state={{ data: updateData()}}> <Icon icon="heroicons-solid:user-plus" /></Link></div>}
          <div><Link to="/graph" style={{color:'#ffffff'}} state={{ data: updateData()}}><Icon icon="heroicons-solid:rectangle-group" /></Link></div>
          <div style={{color:'#a0a0a0'}}><Icon icon="heroicons-solid:table-cells" /></div>
          <div><Link to="/refactoring" style={{color:'#ffffff'}} state={{ data:  updateData()}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></Link></div>
        </div>
        
        <div className="prospective-multi2">
          <label style={{ color: 'white' }}><b>View:</b> </label>
          <Select
            isMulti
            options={POuid === null? Object.keys(data.teamColors).map((team) => ({ value: team, label: team })) : [{ value: POuid[1], label: POuid[1] }]}
            value={selectedTeams}
            onChange={(selectedOptions) => {
              setSelectedTeams(selectedOptions);
              data.teamAffected = selectedOptions;
            }}
            styles={{
              valueContainer: (base) => ({
                ...base,
                maxHeight: "30px",
                maxWidth: "350px",
                overflowY: "auto",
              }),
              menu: (base) => ({
                ...base,
                zIndex: 9999
              })
            }}
          />
        </div>
      </div>

      {/*sliders*/}
      <br/><br/><br/>
      <div style={{ width: "80%", padding: "1rem 5rem", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "80%" }}>
          <ReactSlider
            value={effort}
            onChange={(x) => { data.effort = x; setEffort(x); }}
            min={0}
            max={2}
            step={1}
            withTracks={true}
            className="horizontal-slider"
            thumbClassName="slider-thumb"
            renderThumb={(props, state) => {
              const { key, ...cleanProps } = props;
              return <div key={key} {...cleanProps} style={{...props.style, zIndex: state.index === 0 && effort[0] === effort[1] ? 1 : 2}}>|</div>}}
          />
        </div>
    </div>
    <div style={{ display: "flex" }}>
      <div style={{ padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center"}}>
        <ReactSlider
            value={urgency}
            onChange={(x) => {data.urgency = x; setUrgency(x);}}
            min={0}
            max={6}
            step={1}
            orientation="vertical"
            withTracks={true}
            className="vertical-slider"
            thumbClassName="slider-thumb"

            renderThumb={(props, state) => {
              const { key, ...cleanProps } = props;
              return (<div key={key} {...cleanProps} style={{...props.style, zIndex: state.index === 0 && urgency[0] === urgency[1] ? 1 : 2}}>&gt;</div>);}}
        />
      </div>
      {/*griglia */}
        <div className="grid-container">
          {/*intestazione delle righe */}
          <div className="header-cell">Urgency \ Effort</div>
          {effortLevels.map((priority) => (
            <div key={priority} className="header-cell">{priority}</div>
          ))}
          {priorityLevels.map((priority, priorityIndex) => (
            <React.Fragment key={priority}>
              <div className="row-header">{priority}</div>
              {effortLevels.map((effort, effortIndex) => (
                <div key={`${effort}-${priority}`} className="grid-cell" style = {{backgroundColor: !checkPriority(priorityIndex) || !checkEffort(effortIndex)? "gray": effort === "To define"? "#e0e0e0": undefined
                }}>
                  { //inserisci gli smell giusti
                    service.map((r, serviceIndex) =>
                      r.smellsInstances.map((smell, smellIndex) => (
                        smell.impact === priority && (selectedTeams.some(team => team.value === r.team)) ? (
                          <React.Fragment key={priority+" "+smellIndex}>
                            {/*per ogni refactoring*/}
                            {checkPriority(priorityIndex) && checkEffort(effortIndex)?
                            Array(smellList.current[smell.smell].refactoring.length).fill().map((_, refactorIndex) => (
                              smell.effort[smellList.current[smell.smell].refactoring[refactorIndex]] === effort && //è del giusto effort
                              !alreadyPlaced(r.smellsInstances, smellList.current[smell.smell].refactoring[refactorIndex], smell) ?
                              //true?
                              <div key={`${serviceIndex}-${smellIndex}-${refactorIndex}`} className="smell-box" style={{ backgroundColor: r.color }}
                                onMouseEnter={(e) => {  //per la gestione dell'overlay
                                  setHoveredSmell(r);
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredSmell(null)}>

                                <div className="smell-content">
                                  <button onClick={() => updateEffort(serviceIndex, smellIndex, refactorIndex, -1)}>&lt;</button>
                                  <span className="refactor-text">
                                    {smellList.current[smell.smell].refactoring[refactorIndex]}
                                  </span>
                                  <button onClick={() => updateEffort(serviceIndex, smellIndex, refactorIndex, 1)}>&gt;</button>
                                </div>
                                <div className="service-name">{"Service: " + r.name}</div>
                                {/*icone team affetti*/}
                                <div className="team-icons">
                                    {Array.from(affectedTeam(r)).map((team, idx) => (
                                      <Icon icon="heroicons-solid:user"
                                        key={idx}
                                        className="team-icon"
                                        style={{
                                          color: data.teamColors[team],
                                          width: '25px',
                                          height: '25px',
                                          borderRadius: '30%',
                                          margin: '2px',
                                          filter: 'drop-shadow(0px 0px 1px black)'
                                        }}
                                        title={team} // Tooltip col nome del team
                                      />
                                    ))}
                                  </div>
                              </div> : null
                            )):null}
                          </React.Fragment>
                        ) : null
                      ))
                    )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/*sezione refactoring senza effort */}
      <div className="undefined-effort-section">
        <h3 style={{ textAlign: 'center', fontSize: '1.5rem', color: '#333', marginBottom: '1rem' }}>Refactoring without defined effort</h3>
        <br/>
        {noUndefinedEfforts ? (
          <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#555' }}>
            All refactorings have an assigned effort!
          </p>) : (
          <div className="undefined-effort-list">
            {undefinedEffortItems.map(({ serviceIndex, smellIndex, refactorIndex, r, smell, refact }, i) => (
              <div key={i} className="smell-box" style={{ backgroundColor: r.color }}>
                <div className="smell-content">
                  <button onClick={() => updateEffort(serviceIndex, smellIndex, refactorIndex, -1)}>&lt;</button>
                  <span className="refactor-text">{refact}</span>
                  <button onClick={() => updateEffort(serviceIndex, smellIndex, refactorIndex, 1)}>&gt;</button>
                </div>
                <div className="service-name">Service: {r.name}</div>
                <div className="team-icons">
                  {Array.from(affectedTeam(r)).map((team, idx) => (
                    <Icon
                      icon="heroicons-solid:user"
                      key={idx}
                      className="team-icon"
                      style={{
                        color: data.teamColors[team],
                        width: '25px',
                        height: '25px',
                        borderRadius: '30%',
                        margin: '2px',
                        filter: 'drop-shadow(0px 0px 1px black)',
                      }}
                      title={team}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      
      {/*overlay per i team*/}
      {hoveredSmell && (
        <div
          className="tooltip-overlay"
          style={{
            top: Math.min(tooltipPosition.y + 10, window.innerHeight - 100),
            left: Math.min(tooltipPosition.x + 10, window.innerWidth - 200),
          }}
        > 
          { 
            "Team affected: " + ([...affectedTeam(hoveredSmell)].join(", ") || "None")
          }
        </div>
      )}
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
    </div>
  );
}