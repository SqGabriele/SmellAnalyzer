import { useEffect, useRef, useState } from "react";
import "../style.css";
import qualityAttributes from "../Config/QualityAttributes.json";

const Dialog = ({ isOpen, onClose, onSave, service, currentSmells, TeamLeader }) => {
  const dialogRef = useRef(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [smells, setSmells] = useState([]);
  const [attributes, setAttributes] = useState({});
  const [serviceRelevance, setServiceRelevance] = useState("");
  const [isThisTeamLeader, setIsThisTeamLeader] = useState(false);

  // Quando `isOpen` cambia, apri o chiudi il dialog
  useEffect(() => {
    if (isOpen) {
      if(TeamLeader === null || TeamLeader === service.current?.team)
        setIsThisTeamLeader(true);
      else
        setIsThisTeamLeader(false);
      dialogRef.current?.showModal();
      setName(service.current?.name);
      setTeam(service.current?.team);
      setSmells(service.current?.smellsInstances);
      setServiceRelevance(service.current?.relevance);
      setAttributes(service.current?.attributes)
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleSmellsChange = (event, smell) => {
    const {_, checked} = event.target;

    setSmells((prevProperties) => {
      if (checked) {
        //crea la lista di effort
        let eff = {};
        for(let i of currentSmells[smell].refactoring)
          eff[i] = "To define";

        return [...prevProperties, {"smell":smell, "effort": eff, "originalImpact":"None"}]; //aggiungi la proprietà selezionata
      } else {
        return prevProperties.filter((smells) => smells["smell"] !== smell); //rimuovi la proprietà deselezionata
      }
    });
  };
  
  const Save = () => {
    const updatedService = {
      ...service.current,
      "name" : name,
      "team" : team,
      "relevance" : serviceRelevance,
      "smellsInstances" : smells,
      "attributes": attributes
    }
    onSave(updatedService);
    onClose();
  }

  if(service.current === null)
    return null;

  return (
    <dialog ref={dialogRef}>
      <div className="dialog-box">
        <button className="service-button delete" onClick={onClose}>X</button>
          <div> 
            <b>Name:</b>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength="50"
            />
          </div>
          <div>
            <b>Team:</b>
            <input
                type="text"
                value={team}
                onChange={TeamLeader !== service.current.team? (e) => setTeam(e.target.value) : ()=>{}}
                maxLength="50"
            />
          </div>
          <div>
            <b>Relevance:</b>
            <select value={serviceRelevance} onChange={(e) => setServiceRelevance(e.target.value)}>
              <option value="None">None</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/*Smell*/}
          <h3 style={{ color : "rgb(0, 132, 255)"}}>Select Smells:</h3>
          <div className="smell-selection-container">
          {Object.keys(currentSmells).map((smell) => (
            <div key={smell} className="smell-item">
              <input
                type="checkbox"
                name={smell}
                onChange={(event) => handleSmellsChange(event, smell)}
                checked={smells.some((sm) => sm.smell === smell)} 
              />
              {smell}
            </div>
          ))}
          </div>

          {/*Quality Attributes*/}
          <h3 style={{ color : "rgb(0, 132, 255)"}}>Set Quality Attributes Relevance:</h3>
          <div className="smell-selection-container">
          {qualityAttributes.map((attribute) => (
            <div key={attribute} className="smell-item" style={{width:"100%"}}>
              {attribute}
              
              <select
                onChange={(event) => {
                  const impactValue = event.target.value;
                  setAttributes((prevAttributes) => ({
                    ...prevAttributes,
                    [attribute]: impactValue
                  }));
                }}
                value={(() => {
                  return attributes[attribute] || "None";
                })()} 
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          ))}
          </div>

        <button className="dialog-save" onClick={!isThisTeamLeader? (()=>{return}) : Save} style={{cursor: !isThisTeamLeader ? "not-allowed" : "pointer", background: !isThisTeamLeader? "rgb(134, 134, 134)" : "hsl(216, 98.4%, 52.2%)"}}>
          Save
        </button>
      </div>
    </dialog>
  );
};

export default Dialog;
