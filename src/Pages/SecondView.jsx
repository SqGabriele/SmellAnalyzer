import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import { useNavigate } from "react-router-dom";
import React from "react";
import Select from "react-select";
import ReactSlider from "react-slider";
import "../style.css";

export function SecondView({page, setPage}) {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.data || {};

  const priorityLevels = ["High", "Medium to High", "Medium", "Low to Medium", "Low", "None to Low", "None"];
  const effortLevels = ["High effort", "Medium effort", "Low effort"];

  //smells recuperati dai dati
  const [service, setService] = useState(data.services || []);
  const smellList = useRef(data.currentSmells);
  const [selectedTeams, setSelectedTeams] = useState(data.teamAffected || []); //per la prospettiva
  const [selectedTeams2, setSelectedTeams2] = useState(data.team); //per i team affetti
  const [hoveredSmell, setHoveredSmell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [urgency, setUrgency] = useState(data.urgency);
  const [effort, setEffort] = useState(data.effort);

  //naviga grazie al chatbot
  useEffect(() => {
    if (!page.done) {
      const d = { ...updateData() };
      if (page.type === "effort") d.effort = page.content;
      else if (page.type === "urgency") d.urgency = page.content;
      else if (page.type === "team" && data.teamColors[page.content]) d.teamAffected = [{value: page.content, label: page.content}];
  
      if (page.page === 3) {
        navigate("/refactoring", { state: { data: d } });
      }
  
      setPage(prev => ({ ...prev, done: true }));
    }
  }, [page]);

  //aumenta o diminuisce l'effort
  const updateEffort = (serviceIndex, smellIndex, increment) => {
    setHoveredSmell(null);
    setService((prevService) => {
      const newService = [...prevService];
      const updatedSmell = newService[serviceIndex].smellsInstances[smellIndex];
  
      //calcolo il nuovo valore dell'effort
      let val = effortLevels.indexOf(updatedSmell.effort);
      val = val + increment;
      if (val < 0) val = 2;
      else if (val > 2) val = 0;
  
      //aggiorna l'effort
      updatedSmell.effort = effortLevels[val];
  
      return newService;
    });
  };

  //calcola i team che coinvolge uno smell
  const affectedTeam = (hoveredSmell) => {
    return new Set([
      ...data.arcs
      .filter(arc => arc[0]?.name === hoveredSmell.name && arc[1]?.team !== hoveredSmell.team) 
      .map(arc => arc[1].team)])
  }

  const isAffectedByATeam = (service) => {
    const teams = affectedTeam(service);
    return selectedTeams2.some(x => teams.has(x.value));
  }

  const alreadyPlaced = (serviceSmells, refactoring, smell) =>{
    const stringToInt = (string) =>{
      switch(string){
        case "None": return 0;
        case "Low": return 1;
        case "Medium": return 2;
        case "High": return 3;
      }
    }
    return serviceSmells.some((x) => //se nello stesso servizio uno smell ha lo stesso refactoring ed ha un impatto maggiore (oppure stesso impatto ma sono diversi)
      {
        const a = smellList.current[x.smell].refactoring.includes(refactoring);
        let b;
        if(x.originalImpact !== smell.originalImpact) //prendo il più grande
          b = stringToInt(x.originalImpact) > stringToInt(smell.originalImpact);
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
    return !(EffortIndex < effort[0] || EffortIndex > effort[1]);
  }

  const updateData = () =>{
    data.teamAffected = selectedTeams;
    data.team = selectedTeams2;
    data.urgency = urgency;
    data.effort = effort;
    return data;
  }

  return (
    <div>
      {/*topbar*/}
      <div className="topnav">
        <div className="prospective-multi">
          <label style={{ color: 'white' }}><b>Filter by Team</b></label>
          <Select 
            isMulti
            options={Object.keys(data.teamColors).map((team) => ({ value: team, label: team }))}
            value={selectedTeams2}
            onChange={(selectedOptions) => {
              setSelectedTeams2(selectedOptions);
              data.team = selectedOptions;
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

        {/*Link alle altre viste */}
        <div className="links">
          <div><Link to="/" style={{color:'#ffffff'}} state={{ data: updateData()}}><Icon icon="heroicons-solid:rectangle-group" /></Link></div>
          <div style={{color:'#a0a0a0'}}><Icon icon="heroicons-solid:table-cells" /></div>
          <div><Link to="/refactoring" style={{color:'#ffffff'}} state={{ data:  updateData()}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></Link></div>
        </div>
        
        <div className="prospective-multi2">
          <label style={{ color: 'white' }}><b>View:</b> </label>
          <Select
            isMulti
            options={Object.keys(data.teamColors).map((team) => ({ value: team, label: team }))}
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
      <div style={{ width: "100%", padding: "1rem 5rem", display: "flex", justifyContent: "center" }}>
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
                <div key={`${effort}-${priority}`} className="grid-cell" style = {(!checkPriority(priorityIndex) || !checkEffort(effortIndex))?{ backgroundColor: "gray" }: null}>
                  { //inserisci gli smell giusti
                    service.map((r, serviceIndex) =>
                      r.smellsInstances.map((smell, smellIndex) => (
                        smell.effort === effort && smell.impact === priority && ((selectedTeams.some(team => team.value === r.team)) || isAffectedByATeam(r)) ? (
                          <React.Fragment key={priority+" "+smellIndex}>
                            {/*per ogni refactoring*/}
                            { checkPriority(priorityIndex) && checkEffort(effortIndex)?
                              Array(smellList.current[smell.smell].refactoring.length).fill().map((_, refactorIndex) => (
                              !alreadyPlaced(r.smellsInstances, smellList.current[smell.smell].refactoring[refactorIndex], smell) ?
                              //true?
                              <div key={`${serviceIndex}-${smellIndex}-${refactorIndex}`} className="smell-box" style={{ backgroundColor: r.color }}
                                onMouseEnter={(e) => {  //per la gestione dell'overlay
                                  setHoveredSmell(r);
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredSmell(null)}>

                                <div className="smell-content">
                                  <button onClick={() => updateEffort(serviceIndex, smellIndex, -1)}>&lt;</button>
                                  <span className="refactor-text">
                                    {smellList.current[smell.smell].refactoring[refactorIndex]}
                                  </span>
                                  <button onClick={() => updateEffort(serviceIndex, smellIndex, 1)}>&gt;</button>
                                </div>
                                <div className="service-name">{"Service: " + r.name}</div>
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
    </div>
  );
}