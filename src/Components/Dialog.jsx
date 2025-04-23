import { useEffect, useRef, useState } from "react";
import "../style.css";

const Dialog = ({ isOpen, onClose, onSave, service, currentSmells }) => {
  const dialogRef = useRef(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [smells, setSmells] = useState([]);
  const [serviceRelevance, setServiceRelevance] = useState("");

  // Quando `isOpen` cambia, apri o chiudi il dialog
  useEffect(() => {

   //if(service.current != null)
   // console.log(service.current?.smellsInstances);

    if (isOpen) {
      dialogRef.current?.showModal();
      setName(service.current?.name);
      setTeam(service.current?.team);
      setSmells(service.current?.smellsInstances);
      setServiceRelevance(service.current?.relevance);
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleSmellsChange = (event, smell) => {
    const {_, checked} = event.target;

    setSmells((prevProperties) => {
      if (checked) {
        return [...prevProperties, {"smell":smell, "effort":"Low effort", "originalImpact":"None"}]; //aggiungi la proprietà selezionata
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
      "smellsInstances" : smells
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
                onChange={(e) => setTeam(e.target.value)}
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
              
              <select
                onChange={(event) => {
                  const impactValue = event.target.value;
                  setSmells((prevSmells) =>
                    prevSmells.map((s) =>
                      s.smell === smell ? { ...s, originalImpact: impactValue } : s
                    )
                  );
                }}
                value={(() => {
                  const s = smells.find((sm) => sm.smell === smell);
                  return s ? s.originalImpact : "None";
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

        <button className="dialog-save" onClick={Save}>
          Save
        </button>
      </div>
    </dialog>
  );
};

export default Dialog;
