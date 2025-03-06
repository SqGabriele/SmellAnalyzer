import { useState } from 'react'
import Service from './Service';
import Lines from './Arcs';
import './App.css'

let TeamColors = {};
const CurrentSmells = ['Insufficient Access Control', 'Publicly Accessible Microservices', 'Unnecessary Privileges to Microservices', 'Own Crypto Code', 'Non-Encrypted Data Exposure'];

function App() {
  const [rectangles, setRectangles] = useState([]);
  const [serviceName, setServiceName] = useState(''); //Stato per il nome del servizio
  const [TeamName, setTeamName] = useState(''); //Stato per il team del servizio
  const [smells, setSmells] = useState([]); //Stato per gli smells assegnati
  const [arcs, setArcs] = useState([]); //Stato per memorizzare gli archi
  const [serviceNode1, setServiceNode1] = useState(''); //nodi collegati dagli archi
  const [serviceNode2, setServiceNode2] = useState(''); 
  const [currentSmells, setCurrentSmells] = useState(CurrentSmells); //smells disponibili
  const [newSmell, setNewSmell] = useState(''); // stato per il nuovo smell

  //Funzione per generare un nuovo nodo
  const generateRandomRectangle = () => {
    //controlla se esiste già
    if(rectangles.some((x) => x.name == serviceName))
      return;

    const randomX = Math.floor(Math.random() * window.innerWidth/3+300);
    const randomY = Math.floor(Math.random() * window.innerHeight/3+100);

    //genera il colore per un team
    if(!(TeamName in TeamColors)){
      const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
      TeamColors[TeamName] = randomColor;
    }

    const newRectangle = {
      key: Date.now(),
      x: randomX,
      y: randomY,
      color: TeamColors[TeamName],
      name : serviceName,
      smells: smells,
      team : TeamName
    };

    setRectangles((prevRectangles) => [...prevRectangles, newRectangle]);
    setServiceName('');
  };

  const handleSmellsChange = (event) => {
    const {name, checked} = event.target;
    setSmells((prevProperties) => {
      if (checked) {
        return [...prevProperties, name]; // Aggiungi la proprietà selezionata
      } else {
        return prevProperties.filter((smells) => smells !== name); // Rimuovi la proprietà deselezionata
      }
    });
  };

  const handleRemoveSmell = (smell) => {
    setCurrentSmells((prevSmells) => prevSmells.filter((s) => s !== smell));
    setSmells((prevProperties) => prevProperties.filter((s) => s !== smell));
  };

  const handleNameChange = (event) => {
    setServiceName(event.target.value); // Aggiorna lo stato con il nome inserito
  };
  const handleTeamChange = (event) => {
    setTeamName(event.target.value); // Aggiorna lo stato con il team inserito
  };
  const handleServiceNode1Change = (event) => {
    setServiceNode1(event.target.value); // Aggiorna lo stato con il nome inserito
  };
  const handleServiceNode2Change = (event) => {
    setServiceNode2(event.target.value); // Aggiorna lo stato con il nome inserito
  };

  // Rimuove il servizio dall'array
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

  //Funzione per aggiornare la posizione del servizio
  const updatePosition = (id, newX, newY) => {
    setRectangles((prevRectangles) => {
      const updatedRectangles = prevRectangles.map((rect) =>
        rect.key === id ? { ...rect, x: newX, y: newY } : rect
      );
  
      //Dopo aver aggiornato le posizioni, aggiorniamo anche gli archi
      setArcs((prevArcs) => {
        return prevArcs.map((arc) => {
          const [service1, service2] = arc;
  
          //Se il servizio che è stato spostato è uno dei due servizi collegati, aggiorniamo la posizione
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

  //salva un file json con i dati inseriti
  const saveDataToJson = () => {
    const dataToSave = {
      rectangles: rectangles,
      teamColors: TeamColors,
      arcs: arcs,
      currentSmells: currentSmells
    };
  
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
          
          // Ripristina lo stato con i dati caricati
          setRectangles(loadedData.rectangles || []);
          setArcs(loadedData.arcs || []);
          TeamColors = loadedData.teamColors || {};
          setCurrentSmells(loadedData.currentSmells || CurrentSmells);
        } catch (error) {
          console.error('Error reading JSON file:', error);
        }
      };
  
      reader.readAsText(file);
    }
  };

  // Funzione per aggiungere un nuovo smell
  const handleAddSmell = () => {
    if (newSmell && !currentSmells.includes(newSmell)) {
      setCurrentSmells((prevSmells) => [...prevSmells, newSmell]);
      setNewSmell('');
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <div>
          <h2>New microservice</h2>
          <input
            type="text"
            placeholder="Service Name"
            value={serviceName}
            onChange={handleNameChange} // Gestisce il cambiamento del nome
          />
          <br /><br />
          <input
            type="text"
            placeholder="Team Name"
            value={TeamName}
            onChange={handleTeamChange} // Gestisce il cambiamento del nome
          />
          <br />
          <br />
          <button onClick={generateRandomRectangle}>New microservice</button>
        </div>
        <br /><br />
        <div>
          <h2>New link</h2>
          <input
            type="text"
            placeholder="Service 1"
            value={serviceNode1}
            onChange={handleServiceNode1Change} // Gestisce il cambiamento del nome
          />
          <br /><br />
          <input
            type="text"
            placeholder="Service 2"
            value={serviceNode2}
            onChange={handleServiceNode2Change} // Gestisce il cambiamento del nome
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
              onPositionChange={updatePosition} //Gestisce lo spostamento
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
            onChange={(e) => setNewSmell(e.target.value)} // Gestisce il cambiamento del nuovo smell
          />
          <button onClick={handleAddSmell} style={{ marginLeft: '10px' }}>
            Add Smell
          </button>
        </div>
        <h3>Select Smells</h3>
        {currentSmells.map((smells) => (
          <label key={smells}>
            <input
              type="checkbox"
              name={smells}
              onChange={handleSmellsChange}
            />
            {smells}
            <button onClick={() => handleRemoveSmell(smells)} style={{ marginLeft: '10px' }}>
              X
            </button>
            <br />
          </label>
        ))}

      </div>
    </div>
  );
}

export default App;
