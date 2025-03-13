import Service from '../Components/Service';
import Lines from '../Components/Arcs';
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Smell from '../Components/Smell.js';

const CurrentSmells = [new Smell('Insufficient Access Control','Use OAuth 2.0'), new Smell('Publicly Accessible Microservices','Add an API Gateway'), new Smell('Unnecessary Privileges to Microservices','Follow the Least Privilege Principle'), new Smell('Own Crypto Code','Use of Established Encryption Technologies'), new Smell('Non-Encrypted Data Exposure','Encrypt all Sensitive Data at Rest')];

export function FirstView(){
  const location = useLocation();
  const data = location.state?.data;

  const [rectangles, setRectangles] = useState([]);
  const [serviceName, setServiceName] = useState(''); //stato per il nome del servizio
  const [TeamName, setTeamName] = useState(''); //stato per il team del servizio
  const [smells, setSmells] = useState([]); //stato per gli smells assegnati
  const [arcs, setArcs] = useState([]); //stato per memorizzare gli archi
  const [serviceNode1, setServiceNode1] = useState(''); //nodi collegati dagli archi
  const [serviceNode2, setServiceNode2] = useState(''); 
  const [currentSmells, setCurrentSmells] = useState(CurrentSmells); //smells disponibili
  const [newSmell, setNewSmell] = useState(''); //stato per il nuovo smell
  const [newSmellRefactoring, setNewSmellRefactoring] = useState(''); //stato per i refactoring
  const [teamColors, setTeamColors] = useState({});
  const [serviceRelevance, setServiceRelevance] = useState('None');

  //ripristina lo stato con i dati caricati
  const loadData = (loadedData) => {
    setRectangles(loadedData.rectangles || []);
    setArcs(loadedData.arcs || []);
    setTeamColors(loadedData.teamColors || {});
    setCurrentSmells(loadedData.currentSmells || CurrentSmells);
  }

  useEffect(() => {
    if (data !== undefined) {
      loadData(data);
    }
  }, [data]);

  //funzione per generare un nuovo nodo
  const generateRandomRectangle = () => {
    //controlla se esiste già
    if(rectangles.some((x) => x.name == serviceName))
      return;

    const randomX = Math.floor(Math.random() * window.innerWidth/3+300);
    const randomY = Math.floor(Math.random() * window.innerHeight/3+100);

    let updatedColors = teamColors;
    //genera il colore per un team
    if (!(TeamName in updatedColors)) {
      const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
      updatedColors[TeamName] = randomColor;
      setTeamColors((prevColors) => ({
        ...prevColors,
        [TeamName]: prevColors[TeamName] || `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`,
      }));
    }

    //crea la priorità sulla base della rilevanza del servizio e sull'impatto sullo smell
    const updatePriority = (s) => {
      const stringToInt = (string) =>{
        switch(string){
          case "None": return 0;
          case "Low": return 1;
          case "Medium": return 2;
          case "High": return 3;
        }
      }
      const relevance = stringToInt(serviceRelevance);
      const impact = stringToInt(s.impact);
      const priority = relevance + impact; 
      switch(priority){
        case 0: return "None";
        case 1: return "None to Low";
        case 2: return "Low";
        case 3: return "Low to Medium";
        case 4: return "Medium";
        case 5: return "Medium to High";
        case 6: return "High";
      }
    }

    const newRectangle = {
      key: Date.now(),
      x: randomX,
      y: randomY,
      color: updatedColors[TeamName],
      name : serviceName,
      smells: smells.map((s) => ({...s, impact : updatePriority(s)})),
      team : TeamName,
      relevance: serviceRelevance
    };

    setRectangles((prevRectangles) => [...prevRectangles, newRectangle]);
    setServiceName('');
    setServiceRelevance('None');
  };

  const handleSmellsChange = (event, smell, impactOnQAs) => {
    const {name, checked} = event.target;

    setSmells((prevProperties) => {
      if (checked) {
        return [...prevProperties, {"smell":smell, "impact":impactOnQAs, "effort":"Low effort"}]; //aggiungi la proprietà selezionata
      } else {
        return prevProperties.filter((smells) => smells["smell"] !== smell); //rimuovi la proprietà deselezionata
      }
    });
  };

  const handleRemoveSmell = (smell) => {
    setCurrentSmells((prevSmells) => prevSmells.filter((s) => s !== smell));
    setSmells((prevProperties) => prevProperties.filter((s) => s !== smell));
  };

  const handleNameChange = (event) => {
    setServiceName(event.target.value); //aggiorna lo stato con il nome inserito
  };
  const handleTeamChange = (event) => {
    setTeamName(event.target.value); //aggiorna lo stato con il team inserito
  };
  const handleServiceNode1Change = (event) => {
    setServiceNode1(event.target.value); //aggiorna lo stato con il nome inserito
  };
  const handleServiceNode2Change = (event) => {
    setServiceNode2(event.target.value); //aggiorna lo stato con il nome inserito
  };

  //rimuove il servizio dall'array
  const handleDelete = (id) => {
    setRectangles((rectangles) => rectangles.filter((service) => service.key !== id));
    setArcs((prevArcs) => prevArcs.filter((arc) => arc[0].key !== id && arc[1].key !== id));
  };

  //funzione per generare nuovi link tra nodi
  const generateNewLink = () => {
    //controlla se esiste già
    if(arcs.some((x) => (x[0].name == serviceNode1) && (x[1].name == serviceNode2)))
      return;

    const firstNode = rectangles.find((x) => x.name == serviceNode1);
    const secondNode = rectangles.find((x) => x.name == serviceNode2);

    if(firstNode != undefined && secondNode != undefined)
      setArcs((prevArcs) => [...prevArcs, [firstNode, secondNode]]);
  };

  //funzione per aggiornare la posizione del servizio
  const updatePosition = (id, newX, newY) => {
    setRectangles((prevRectangles) => {
      const updatedRectangles = prevRectangles.map((rect) =>
        rect.key === id ? { ...rect, x: newX, y: newY } : rect
      );
  
      //dopo aver aggiornato le posizioni, aggiorniamo anche gli archi
      setArcs((prevArcs) => {
        return prevArcs.map((arc) => {
          const [service1, service2] = arc;
  
          //se il servizio che è stato spostato è uno dei due servizi collegati, aggiorniamo la posizione
          if (service1.key === id) {
            return [{ ...service1, x: newX, y: newY }, service2];
          } else if (service2.key === id) {
            return [service1, { ...service2, x: newX, y: newY }];
          }
          return arc;
        });
      });
  
      return updatedRectangles;
    });
  };

  //usato sia per salvare i file json, che per persistere dati tra una vista e l'altra
  const dataToSave = {
    rectangles: rectangles,
    teamColors: teamColors,
    arcs: arcs,
    currentSmells: currentSmells
  };

  //salva un file json con i dati inseriti
  const saveDataToJson = () => {
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smells_save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadDataFromJson = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const loadedData = JSON.parse(e.target.result);
          
          loadData(loadedData);
        } catch (error) {
          console.error('Error reading JSON file:', error);
        }
      };
  
      reader.readAsText(file);
    }
  };

  //funzione per aggiungere un nuovo smell
  const handleAddSmell = () => {
    if (newSmell && !currentSmells.some(s => s.name == newSmell)) {
      setCurrentSmells((prevSmells) => [...prevSmells, new Smell(newSmell, newSmellRefactoring)]);
      setNewSmell('');
      setNewSmellRefactoring('');
    }
  };


  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <div>
          <h2 style={{ textAlign: 'left' }}>New microservice</h2>
          <input
            type="text"
            placeholder="Service Name"
            value={serviceName}
            onChange={handleNameChange} //gestisce il cambiamento del nome
          />
          <br /><br />
          <input
            type="text"
            placeholder="Team Name"
            value={TeamName}
            onChange={handleTeamChange} //gestisce il cambiamento del nome
          />
          <br /><br />
          <label>Service Relevance </label>
          <select value={serviceRelevance} onChange={(e) => setServiceRelevance(e.target.value)}>
            <option value="None">None</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <br /><br />
          <button onClick={generateRandomRectangle}>New microservice</button>
        </div>
        <br /><br />
        <div>
          <h2 style={{ textAlign: 'left' }}>New link</h2>
          <input
            type="text"
            placeholder="Service 1"
            value={serviceNode1}
            onChange={handleServiceNode1Change} //gestisce il cambiamento del nome
          />
          <br /><br />
          <input
            type="text"
            placeholder="Service 2"
            value={serviceNode2}
            onChange={handleServiceNode2Change} //gestisce il cambiamento del nome
          />
          <br /><br />
          <button onClick={generateNewLink}>New Link</button>
        </div>
        <div>
          {rectangles.map((rect) => (
            <Service
              key={rect.key}
              id={rect.key}
              x={rect.x}
              y={rect.y}
              color={rect.color}
              name={rect.name}
              team={rect.team}
              smells={rect.smells}
              onDelete={handleDelete}
              onPositionChange={updatePosition} //gestisce lo spostamento
            />
          ))}
        </div>
        <Lines nodes={arcs} />
        <br /><br /><br /><br />
        <button onClick={saveDataToJson}>Save File</button>
        <br /><br />
        <p>Upload Save file</p>
        <input type="file" onChange={uploadDataFromJson} />
      </div>
          
      <div style={{ marginLeft: '20px' }}> 
        <div>
          <input
            type="text"
            placeholder="New Smell"
            value={newSmell}
            onChange={(e) => setNewSmell(e.target.value)} //gestisce il cambiamento del nuovo smell
          />
          <br/>
          <input
            type="text"
            placeholder="Suggested Refactoring"
            value={newSmellRefactoring}
            onChange={(e) => setNewSmellRefactoring(e.target.value)}
          />
          <button onClick={handleAddSmell} style={{ marginLeft: '10px' }}>
            Add Smell
          </button>
        </div>
        <h3>Select Smells</h3>
        {currentSmells.map((smell) => (
          <div key={smell.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <input
              type="checkbox"
              name={smell.name}
              onChange={(event) => handleSmellsChange(event, smell, "None")}
            />
            <span style={{ marginLeft: '10px' }}>{smell.name}</span>
            
            <select
              style={{ marginLeft: '10px' }}
              onChange={(event) => {
                const impactValue = event.target.value;
                setSmells((prevSmells) =>
                  prevSmells.map((s) =>
                    s.smell === smell ? { ...s, impact: impactValue } : s
                  )
                );
              }}
            >
              <option value="None">None</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            
            <button onClick={() => handleRemoveSmell(smell)} style={{ marginLeft: '10px' }}>
              X
            </button>
          </div>
        ))}
        <Link to="/smellsPriority" state={{ data: dataToSave}}> Second View</Link>
      </div>
    </div>
  );
}