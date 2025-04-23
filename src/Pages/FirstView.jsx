import Service from '../Components/Service';
import Lines from '../Components/Arcs';
import Dialog from '../Components/Dialog';
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import smellDefault from '../Smells.json';
import "../style.css";

export function FirstView({page, setPage, teamForChatBot}){
  const location = useLocation();
  const data = location.state?.data;
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState(''); //stato per il nome del servizio
  const [TeamName, setTeamName] = useState(''); //stato per il team del servizio
  const [arcs, setArcs] = useState([]); //stato per memorizzare gli archi
  const [newArc, setNewArc] = useState(null);
  const isGeneratingNewArc = useRef(false);
  const [currentSmells, setCurrentSmells] = useState({}); //smells disponibili
  const [teamColors, setTeamColors] = useState({});
  const [serviceRelevance, setServiceRelevance] = useState('None');
  const [mousePosition,setMousePosition] = useState({ x: null, y: null }); //posizione del mouse
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogService = useRef(null); //di quale service apro il dialog?
  const [prospective, setProspective] = useState(data?.teamAffected || []); //cambia la prospettiva
  const teamCounter = useRef(data?.counter || {}); 
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false); //per i team affetti
  

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  //naviga grazie al chatbot
  useEffect(() => {
    if (!page.done) {
      const d = { ...dataToPersist };
      if (page.type === "effort") d.effort = page.content;
      else if (page.type === "urgency") d.urgency = page.content;
      else if (page.type === "team" && teamColors[page.content]) d.teamAffected = [{value: page.content, label: page.content}];
  
      if (page.page === 3) {
        navigate("/refactoring", { state: { data: d } });
      }
  
      setPage(prev => ({ ...prev, done: true }));
    }
  }, [page]);
  
  const presetColors = useRef({
    "hsl(44, 100%, 50%)": false,
    "hsl(147, 100%, 50%)": false,
    "hsl(288, 100%, 50%)": false,
    "hsl(190, 100%, 50%)": false,
    "hsl(18, 100%, 50%)": false,
    "hsl(280, 100%, 50%)": false,
    "hsl(200, 100%, 50%)": false,
    "hsl(338, 100%, 50%)": false,
    "hsl(135, 100%, 50%)": false,
  });

  //gestisce i team dinamicamente
  const addToTeam = (team, updateProspective = true) => {  
    if (teamCounter.current[team] === undefined)
      teamCounter.current[team] = 1;
    else
      teamCounter.current[team] += 1;
  
    if (updateProspective && !prospective.some(x => x.value === team)) {
      setProspective(prev => [...prev, { value: team, label: team }]);
    }
  }

  const removeToTeam = (team) =>{
    if(teamCounter.current[team] === undefined)
      return;
    teamCounter.current[team] -= 1;
    if(teamCounter.current[team] <= 0){
      delete teamCounter.current[team];
      if(presetColors.current[teamColors[team]] !== undefined)
        presetColors.current[teamColors[team]] = false;
      delete teamColors[team];
      
      if(data?.team)
        data.team = data.team.filter(x => x.value!==team);
      setProspective(prev => prev.filter(x => x.value !== team));
    }  
  }

  //ripristina lo stato con i dati caricati
  const loadData = (loadedData, fromSave=false) => {
  setServices(loadedData.services || []);
  setArcs(loadedData.arcs || []);
  setTeamColors(loadedData.teamColors || {});
  setCurrentSmells(loadedData.currentSmells || {});
  setIsCheckboxChecked(loadedData.checkboxOption || false);
  for(let color of Object.keys(loadedData.teamColors)){
    const c = loadedData.teamColors[color];
    if(presetColors.current[c] !== undefined)
      presetColors.current[c] = true;
  }

  //cambia prospettiva
  if(fromSave){
    const newTeams = new Set();
    if(data?.team)
      data.team = [];
    teamCounter.current = {};
    (loadedData.services || []).forEach((x) => {
      addToTeam(x.team, false);
      newTeams.add(x.team);
    });
    setProspective([...newTeams].map(t => ({ value: t, label: t })));
  } 
};

  useEffect(() => {
    if (data !== undefined) {
      loadData(data);
    }
  }, [data]);

  //leggi gli smell dal json di default
  useEffect(() =>{
    if(data === undefined){
      try {
        setCurrentSmells(smellDefault);
      } catch (error) {
        console.error("Error loading JSON data:", error);
      }
    }
  },[]);

  //copia i team per il chatbot
  useEffect(()=>{
    teamForChatBot.current = teamColors;
  },[teamColors])

  //muovi il mouse e clicca
  useEffect(() => {
    const updateMousePosition = (ev) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
      if(newArc !== null){
        setNewArc(prevArc => {
          const [start, _] = prevArc.arcPosition;
          return { 
            arcPosition: [start, { x: ev.clientX, y: ev.clientY }],
            startService: prevArc.startService
          };
        });
        isGeneratingNewArc.current = true;
      }
    };

    const resetArcOnClick = () => {
      if(isGeneratingNewArc.current === true){
        setNewArc(null);
        isGeneratingNewArc.current = false;
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('click', resetArcOnClick);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('click', resetArcOnClick);
    };
  }, [newArc]);

  //genera il colore per un team
  const generateTeam = (teamName) => {
    
    const generateColor = () =>{
      let color;
      let possibleColors = Object.keys(presetColors.current);
      possibleColors = possibleColors.filter((x) => presetColors.current[x] != true); //tolgo quelli usati
      if(possibleColors.length > 0){
        color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
        presetColors.current[color] = true;
        return color;
      }
      
      //evita colori contrastanti con i pulsanti
      do {color = Math.floor(Math.random() * 360);}
      while (
        (color <= 10) || 
        (color >= 210 && color <= 270) || 
        (color >= 350)
      );
      return `hsl(${color}, 100%, 50%)`;
    }

    let updatedColors = teamColors;
    addToTeam(teamName);
    
    if (!(teamName in updatedColors)) {
      const randomColor = generateColor();
      updatedColors[teamName] = randomColor;
      setTeamColors((prevColors) => ({
        ...prevColors,
        [teamName]: randomColor,
      }));
    }
  }

  //crea la priorità sulla base della rilevanza del servizio e sull'impatto sullo smell
  const updatePriority = (s, rel) => {
    const stringToInt = (string) =>{
      switch(string){
        case "None": return 0;
        case "Low": return 1;
        case "Medium": return 2;
        case "High": return 3;
      }
    }
    const relevance = stringToInt(rel);
    const impact = stringToInt(s.originalImpact);
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

  //funzione per generare un nuovo nodo
  const generateService = () => {
    //controlla se esiste già o nomi invalidi
    if(serviceName==="" || TeamName==="")
      return;

    const randomX = Math.floor(Math.random() * window.innerWidth/3+300);
    const randomY = Math.floor(Math.random() * window.innerHeight/3+100);

    generateTeam(TeamName);

    const newService = {
      key: Date.now(),
      x: randomX,
      y: randomY,
      color: teamColors[TeamName],
      name : serviceName,
      smellsInstances: [],
      team : TeamName,
      relevance: serviceRelevance,
      size: { width:160, height:160 }
    };

    setServices((prevServices) => [...prevServices, newService]);
    setServiceName('');
    setServiceRelevance('None');
  };

  const handleNameChange = (event) => {
    setServiceName(event.target.value); //aggiorna lo stato con il nome inserito
  };
  const handleTeamChange = (event) => {
    setTeamName(event.target.value); //aggiorna lo stato con il team inserito
  };

  //rimuove il servizio dall'array
  const handleDelete = (id, team) => {
    removeToTeam(team);
    setServices((services) => services.filter((service) => service.key !== id));
    setArcs((prevArcs) => prevArcs.filter((arc) => arc[0].key !== id && arc[1].key !== id));
  };

  //funzione per generare nuovi link tra nodi
  const generateNewLink = (endNodeId) => {
    //stessi archi
    if(newArc.startService === endNodeId)
      return

    //controlla se esiste già
    if(arcs.some((x) => (x[0].key === newArc.startService) && (x[1].key === endNodeId)))
      return;

    const firstNode = services.find((x) => x.key == newArc.startService);
    const secondNode = services.find((x) => x.key == endNodeId);

    if(firstNode !== undefined && secondNode !== undefined)
      setArcs((prevArcs) => [...prevArcs, [firstNode, secondNode]]);
  };

  const selectingArc = (startService) => {
    setNewArc({
      "arcPosition": [mousePosition,mousePosition],
      "startService":startService
    })
  }

  const onDeleteArc = (service1, service2) => {
    const updatedNodes = arcs.filter(
      (pair) => !(pair[0].key === service1.key && pair[1].key === service2.key)
    );
    setArcs(updatedNodes);
  }

  //funzione per aggiornare la posizione del servizio
  const updatePosition = (id, newX, newY) => {
    setServices((prevServices) => {
      const updatedServices = prevServices.map((rect) =>
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
  
      return updatedServices;
    });
  };

  const updateRectSize = (id, size) =>{
    setServices((prevServices) => {
      return prevServices.map((rect) =>
        rect.key === id ? { ...rect, size: size } : rect
      );
    });
  }

  //data una diversa prospettiva ti dice se renderizzare un componente
  const renderThisService = (service) => {
    if(prospective.some((x) => service.team === x.value))
      return true;
    if(!isCheckboxChecked)
      return false;
    if(arcs.some((x) =>(x[1].key === service.key && prospective.some((y) => x[0].team === y.value) ) || (x[0].key === service.key && prospective.some((y) => x[1].team === y.value))))
      return true;
    return false;
  }

  //usato per passare i dati da una vista all'altra
  const dataToPersist = {
    services: services,
    teamColors: teamColors,
    arcs: arcs,
    currentSmells: currentSmells,
    teamAffected: prospective,
    team: data?.team || [],
    urgency: data?.urgency || [0,6],
    effort: data?.effort || [0,2],
    checkboxOption: isCheckboxChecked,
    counter: teamCounter.current
  };

  //usato sia per salvare i file json
  const dataToSave = {
    services: services,
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
          
          loadData(loadedData, true);
        } catch (error) {
          console.error('Error reading JSON file:', error);
        }
      };
  
      reader.readAsText(file);
    }
  };

  const uploadSmellFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const loadedData = JSON.parse(e.target.result);
          setCurrentSmells(loadedData);

          //rimuovo gli smell adesso assenti
          const serv = services;
          for(let service of serv){
            service.smellsInstances = service.smellsInstances.filter((s)=> s.smell in loadedData);
          }
          
        } catch (error) {
          console.error('Error reading JSON file:', error);
        }
      };
  
      reader.readAsText(file);
    }
  }

  const openDialog = (id) =>{
    dialogService.current = services.find((x)=>(x.key ===id));
    setIsDialogOpen(true);
  }

  const updateService = (serv) => {
    //se il team è nuovo lo creo
    const team = serv.team;
    generateTeam(team);
    serv.color = teamColors[team];

    //update della rilevanza
    serv.smellsInstances = serv.smellsInstances.map((s) => ({smell:s.smell, effort:s.effort, originalImpact:s.originalImpact, impact : updatePriority(s,serv.relevance)}));

    //aggiorno le informazioni
    setServices((prevServices) =>{
      return prevServices.map(s => {
        if(s.key === serv.key){
          removeToTeam(s.team);
          return serv;
        }
        else
          return s;
        });
    });
  }


  return (
    <div>
      {/*topbar*/}
      <div className="topnav">
        <button onClick={toggleSidebar} className="toggle-btn">
          {isSidebarVisible ? '←|' : '|→'}
        </button>

        {/*checkbox*/}
        <div className="checkbox-container" style={{ marginLeft: "20px", color: 'white' }}>
          <label>
            <b>Includes affected team:  </b>
            <input
              type="checkbox"
              checked={isCheckboxChecked}
              onChange={() => setIsCheckboxChecked(prev => !prev)}
            />
          </label>
        </div>

        {/*Link alle altre viste */}
        <div className="links">
          <div style={{color:'#808080'}}><Icon icon="heroicons-solid:rectangle-group" /></div>
          <div><Link to="/smellsPriority" style={{color:'#ffffff'}} state={{ data: dataToPersist}}><Icon icon="heroicons-solid:table-cells" /></Link></div>
          <div><Link to="/refactoring" style={{color:'#ffffff'}} state={{ data: dataToPersist}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></Link></div>
        </div>
        
         {/*cambia prospettiva */}
         <div className="prospective-multi2">
          <label style={{ color: 'white' }}><b>View:</b> </label>
          <Select
            isMulti
            options={Object.keys(teamColors).map((team) => ({ value: team, label: team }))}
            value={prospective}
            onChange={(selectedOptions) => {
              setProspective(selectedOptions);
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
      <div style={{ display: 'flex' }}>
      {/*Sidebar */}
      {isSidebarVisible && (
        <div className="sidebar">
          <h2>New Microservice</h2>
          <div className="form-group">
            <label>Service Name</label>
            <input
              type="text"
              placeholder="service"
              value={serviceName}
              onChange={handleNameChange}
              maxLength="50"
            />
          </div>
          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              placeholder="team"
              value={TeamName}
              onChange={handleTeamChange}
              maxLength="50"
            />
          </div>
          <div className="form-group">
            <label>Service Relevance</label>
            <select
              value={serviceRelevance}
              onChange={(e) => setServiceRelevance(e.target.value)}
            >
              <option value="None">None</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <button onClick={generateService}> Create Microservice</button>
          <hr />
          <h2>File Management</h2>
          <button onClick={saveDataToJson}> Save to File</button>
          <br/><br/>
          <div className="form-group">
            <label><b>Upload Save File</b></label>
            <input type="file" accept=".json" onChange={uploadDataFromJson} />
          </div>
          <div className="form-group">
            <label><b>Upload Smell List</b></label>
            <input type="file" accept=".json" onChange={uploadSmellFile} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex' }}>
        <div>
          {services.map((rect) => (
            renderThisService(rect) ?
            <Service
              key={rect.key}
              id={rect.key}
              x={rect.x}
              y={rect.y}
              color={rect.color}
              name={rect.name}
              team={rect.team}
              smells={rect.smellsInstances}
              onDelete={handleDelete}
              onPositionChange={updatePosition} //gestisce lo spostamento
              onGenerateArc={selectingArc}
              updateRectSize={updateRectSize}
              isGeneratingNewArc={isGeneratingNewArc}
              addArc={generateNewLink}
              onOpenDialog={openDialog}
            />: null
          ))}
          </div>
          <Lines nodes={arcs} newArc={newArc} prospective={prospective} isChecked={isCheckboxChecked}
          onDeleteArc={onDeleteArc}/>
        </div>

        {/*dialog*/}
        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={updateService}
          service={dialogService}
          currentSmells={currentSmells}
        />
      </div>
    </div>
  );
}