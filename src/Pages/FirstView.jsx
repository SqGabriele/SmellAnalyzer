import Service from '../Components/Service';
import Lines from '../Components/Arcs';
import Dialog from '../Components/Dialog';
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import { signOut, getAuth,onAuthStateChanged   } from "firebase/auth";
import { auth } from "../firebase";
import { getFirestore, setDoc, doc, getDoc } from "firebase/firestore";
import smellDefault from '../Config/Smells.json';
import "../style.css";

export function FirstView({page, setPage, teamForChatBot, serviceForChatBot, POuid}){
  const location = useLocation();
  const data = location.state?.data;
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState(''); //stato per il nome del servizio
  const [TeamName, setTeamName] = useState(POuid === null? '' : POuid[1]); //stato per il team del servizio
  const [arcs, setArcs] = useState([]); //stato per memorizzare gli archi
  const [newArc, setNewArc] = useState(null);
  const isGeneratingNewArc = useRef(false);
  const [currentSmells, setCurrentSmells] = useState(data?.currentSmells || {}); //smells disponibili
  const [teamColors, setTeamColors] = useState({});
  const [serviceRelevance, setServiceRelevance] = useState('None');
  const [mousePosition,setMousePosition] = useState({ x: null, y: null }); //posizione del mouse
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogService = useRef(null); //di quale service apro il dialog?
  const [prospective, setProspective] = useState(data?.teamAffected || []); //cambia la prospettiva
  const teamCounter = useRef(data?.counter || {}); 
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false); //per i team affetti
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false); //per conferma di eliminare un service
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const timeoutRef = useRef(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [nodeRejectionDialog, setNodeRejectionDialog] = useState(false);
  const loadedData = useRef(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [zoom, setZoom] = useState(data?.zoom || 1);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  //ricarica i dati (eventualmente da salvataggio)
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    if (data !== undefined) {
      loadData(data);
    }
    else if (POuid!==null){
      const loadSave = async () => {
        const docRef = doc(db, "Saves", POuid[0]);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const savedData = docSnap.data();
          loadData(savedData, true);
          setProspective([{ value: POuid[1], label: POuid[1] }]);
        }
      }
      loadSave();
    }
    else{
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if(user){
          const uid = auth.currentUser.uid;
          const docRef = doc(db, "Saves", uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const savedData = docSnap.data();
            loadData(savedData, true);
          }
        }
      });

    return () => unsubscribe();
    }
  }, [data]);

  //naviga grazie al chatbot
  useEffect(() => {
    if (!page.done) {
      const d = { ...dataToPersist };
      if (page.type === "effort") d.effort = page.content;
      else if (page.type === "urgency") d.urgency = page.content;
      else if (page.type === "team" && (teamColors[page.content] || page.content === "all")){
        if(page.content !== "all")
          d.teamAffected = [{value: page.content, label: page.content}];
        else 
          d.teamAffected =(Object.keys(teamColors).map((team) => ({ value: team, label: team })));
        if(page.page === 1){
          setProspective(d.teamAffected);
          setIsCheckboxChecked(false);
        }
      }
      else if (page.type === "teamAdd" && (teamColors[page.content])){
        d.teamAffected = prospective;
        d.teamAffected.push({ value: page.content, label: page.content });
        if(page.page === 1){
          setProspective(d.teamAffected);
          setIsCheckboxChecked(false);
        }
      }
      else if(page.type === "team_interaction"){
        setIsCheckboxChecked(true);
      } 
      else if(page.type === "generating_node")
        generateService(null ,page.content[0], page.content[1],"Medium");
      else if(page.type === "generating_link")
        generateNewLink(null, page.content[0], page.content[1]);
      else if(page.type === "remove_link")
        onDeleteArc(null,null, page.content[0], page.content[1]);
      else if(page.type === "remove_service")
        confirmDelete(null, page.content[0]);
      else if(page.type === "suggest"){
        setIsDataLoaded(false)
        setPage(prev => ({ ...prev, doneAsync: false, done:true }));
      }
        
      if (page.page === 3) {
        navigate("/refactoring", { state: { data: d } });
      }
  
      setPage(prev => ({ ...prev, done: true }));
    }
    else if(!page.doneAsync && isDataLoaded){
      if(page.type === "generating_node")
        generateService(null ,page.content[0], page.content[1],"Medium");
      else if(page.type === "generating_link")
        generateNewLink(null, page.content[0], page.content[1]);
      else if(page.type === "remove_link")
        onDeleteArc(null,null, page.content[0], page.content[1]);
      else if(page.type === "remove_service")
        confirmDelete(null, page.content[0]);
      setPage(prev => ({ ...prev, doneAsync: true, done: true }));;
    }
  }, [page,isDataLoaded]);

  const handleClick = async (path) => {
    saveOnCloud();
    navigate(path, { state: { data: dataToPersist } });
  };
  
  const presetColors = useRef({
    "hsl(44, 100%, 50%)": false,
    "hsl(147, 100%, 50%)": false,
    "hsl(299, 100%, 50%)": false,
    "hsl(190, 100%, 50%)": false,
    "hsl(18, 100%, 50%)": false,
    "hsl(280, 100%, 50%)": false,
    "hsl(200, 100%, 50%)": false,
    "hsl(338, 100%, 50%)": false,
    "hsl(120, 100%, 50%)": false,
  });

  const handleLogout = async () => {
    saveOnCloud();
    try {
      await signOut(auth);
      navigate("/"); // Torna alla pagina di login
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

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
    setZoom(loadedData.zoom || 1)
    setServices(loadedData.services || []);
    if(!fromSave)
      setArcs(loadedData.arcs || []);
    else
      setArcs(loadedData.arcs.map(x=> [loadedData.services.find(s => s.key===x.from.key),loadedData.services.find(s => s.key===x.to.key)]) || [])
    const updatedTeamColors = { ...(loadedData.teamColors || {}) };
    setTeamColors(updatedTeamColors);
    setIsCheckboxChecked(loadedData.checkboxOption || false);
    for(let color of Object.keys(loadedData.teamColors)){
      const c = loadedData.teamColors[color];
      if(presetColors.current[c] !== undefined)
        presetColors.current[c] = true;
    }
    setIsDataLoaded(true);

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

      //rimuovi teamColor non presenti in teamCounter (ulteriore controllo)
      const teamKeys = Object.keys(updatedTeamColors);
      for (let team of teamKeys) {
        if (!teamCounter.current.hasOwnProperty(team)) {
          delete updatedTeamColors[team];
        }
      }

      setTeamColors({ ...updatedTeamColors });
    } 
};

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

  //copia i service per il chatbot
  useEffect(()=>{
    serviceForChatBot.current = services;
  },[services])

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
  const updatePriority = (s, rel, qualityAttributes) => {
    const stringToInt = (string) =>{
      switch(string){
        case "None": return 0;
        case "Low": return 1;
        case "Medium": return 2;
        case "High": return 3;
      }
    }
    const relevance = stringToInt(rel);
    //l'impatto si prende il max dell'importanza dei quality attributes
    let impact = 0;
    for(let q of currentSmells[s.smell].qualityAttributes){
      const n = stringToInt(qualityAttributes[q] || "None");
      if(impact < n)
        impact = n;
    }
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
  const generateService = (_, service_name= serviceName, team_name= TeamName, service_relevance= serviceRelevance) => {
    //controlla se esiste già o nomi invalidi
    if(service_name==="" || team_name==="")
      return;

    const randomX = Math.floor(Math.random() * window.innerWidth/3+300);
    const randomY = Math.floor(Math.random() * window.innerHeight/3+100);

    generateTeam(team_name);

    const newService = {
      key: Date.now(),
      x: randomX,
      y: randomY,
      color: teamColors[team_name],
      name : service_name,
      smellsInstances: [],
      attributes: {},
      team : team_name,
      relevance: service_relevance,
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

  //chiede conferma
  const handleDelete = (serviceId, team) => {
    //se sono un team leader
    if(POuid !== null){
      //ci sono archi che lo collegano ad altri team
      const link = arcs.filter((arc) => (arc[0].key === serviceId && arc[1].team !== POuid[1]) || (arc[1].key === serviceId && arc[0].team !== POuid[1]));
      if(link.length >0){
        setNodeRejectionDialog(true);
        return;
      }
    }
    setServiceToDelete({"id":serviceId, "team":team});
    setIsConfirmDialogOpen(true);
  };

  //elimina effettivamente il servizio
  const confirmDelete = (e, serviceName = null) => {
    let s = serviceToDelete;
    if(serviceName !== null){
      const serv = services.find(x=>x.name===serviceName);
      s= {id: serv.key, team: serv.team};
    }

    if (s?.id) {
      removeToTeam(s.team);
      setServices((prevServices) => prevServices.filter((x) => x.key !== s.id));
      setArcs((prevArcs) => prevArcs.filter((arc) => arc[0].key !== s.id && arc[1].key !== s.id));
      setServiceToDelete(null);
      setIsConfirmDialogOpen(false);
      setTimeout(() => {saveOnCloud();},0);
    }
  };

  //funzione per generare nuovi link tra nodi
  const generateNewLink = (endNodeId, startNodeName=null, endNodeName=null) => {
    let startKey = newArc?.startService;
    let endKey = endNodeId;
  
    if(startNodeName)
      startKey= services.find(x=>x.name===startNodeName)?.key;
    if(endNodeName)
      endKey= services.find(x=>x.name===endNodeName)?.key;

    //stessi archi
    if(startKey === endKey)
      return

    //controlla se esiste già
    if(arcs.some((x) => (x[0].key === startKey) && (x[1].key === endKey)))
      return;

    const firstNode = services.find((x) => x.key == startKey);
    const secondNode = services.find((x) => x.key == endKey);

    //l'arco di arrivo non è tuo
    if(POuid !== null && secondNode.team !== POuid[1])
      return;

    if(firstNode !== undefined && secondNode !== undefined)
      setArcs((prevArcs) => [...prevArcs, [firstNode, secondNode]]);
    setTimeout(() => {saveOnCloud();},0);
  };

  const selectingArc = (startService) => {
    setNewArc({
      "arcPosition": [mousePosition,mousePosition],
      "startService":startService
    })
  }

  const onDeleteArc = (service1, service2, serviceName1 = null, serviceName2 = null) => {
    if(serviceName1 !== null)
      service1 = services.find(x=>x.name===serviceName1);
    if(serviceName2 !== null)
      service2 = services.find(x=>x.name===serviceName2);

    const updatedNodes = arcs.filter(
      (pair) => !(pair[0].key === service1.key && pair[1].key === service2.key)
    );
    setArcs(updatedNodes);
    setTimeout(() => {saveOnCloud();},0);
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
    counter: teamCounter.current,
    zoom: zoom
  };

  //usato per salvare i file json
  const dataToSave = {
    services: services,
    teamColors: teamColors,
    arcs: arcs.map(x => ({from: { name: x[0].name, key: x[0].key }, to: { name: x[1].name, key: x[1].key }})),
    zoom: zoom
  };

  //salva un file json con i dati inseriti
  const saveDataToJson = () => {
    saveOnCloud();
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smells_save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  //salva in cloud
  const saveOnCloud = async() =>{
    if(services.length === 0) return;
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
  
    const userId = user!==null ? user.uid : POuid[0];
    const dataToSave = {
      services: services,
      teamColors: teamColors,
      arcs: arcs.map(x => ({from: { name: x[0].name, key: x[0].key }, to: { name: x[1].name, key: x[1].key }})),
      savedAt: new Date(),
      zoom: zoom,
      uid: userId
    };
    try {
      await setDoc(doc(db, "Saves", userId), dataToSave);
    } catch (error) {
      console.error("File failed to upload:", error);
    }
  }

  //Salva in cloud dopo tot
  useEffect(()=>{
    if (timeoutRef.current)
      return;

    timeoutRef.current = setTimeout(() => {
      saveOnCloud();
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  },[services, teamColors, arcs])

  //salva in cloud quando esci
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      saveOnCloud();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);


  const uploadDataFromJson = (event) => {
    const file = event.target.files[0];
    event.target.value = null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          loadedData.current = JSON.parse(e.target.result);
          if(!auth.currentUser || services.length ===0)
            loadData(loadedData.current, true);
          else
            setUploadDialogOpen(true);
        } catch (error) {
          console.error('Error reading JSON file:', error);
        }
      };
  
      reader.readAsText(file);
    }
    saveOnCloud();
  };

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
    serv.smellsInstances = serv.smellsInstances.map((s) => ({smell:s.smell, effort:s.effort, impact : updatePriority(s,serv.relevance, serv.attributes)}));

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
    setTimeout(() => {saveOnCloud();},0);
  }


  return (
    <div>
      {/*topbar*/}
      <div className="topnav">
        { POuid === null &&
          <button onClick={toggleSidebar} className="toggle-btn">
            {isSidebarVisible ? '←|' : '|→'}
          </button>
        }

        <button onClick={() => setLogoutDialogOpen(true)} className="logout" title="Logout" style={{left: "300px"}}>
            <Icon icon="heroicons-solid:arrow-left-on-rectangle" width="30" height="30"/>
        </button>

        {/*checkbox*/}
        <div className="checkbox-container" style={{ marginLeft: "20px", color: 'white' }}>
          <label>
            <b>Team interactions:  </b>
            <input
              type="checkbox"
              checked={isCheckboxChecked}
              onChange={() => setIsCheckboxChecked(prev => !prev)}
            />
          </label>
        </div>

        {/*Link alle altre viste */}
        <div className="links">
          {/*solo se sono loggato*/}
          {auth.currentUser && <div onClick={() => handleClick("/manageAccounts")} style={{ cursor: "pointer", color: '#ffffff' }}>
            <Icon icon="heroicons-solid:user-plus" />
          </div>}
          <div style={{ color: '#808080' }}>
            <Icon icon="heroicons-solid:rectangle-group" />
          </div>
          <div onClick={() => handleClick("/smellsPriority")} style={{ cursor: "pointer", color: '#ffffff' }}>
            <Icon icon="heroicons-solid:table-cells" />
          </div>
          <div onClick={() => handleClick("/refactoring")} style={{ cursor: "pointer", color: '#ffffff' }}>
            <Icon icon="heroicons-solid:magnifying-glass-plus" />
          </div>
        </div>
        
         {/*cambia prospettiva */}
         <div className="prospective-multi2">
          <label style={{ color: 'white' }}><b>View:</b> </label>
          <Select
            isMulti
            options={POuid === null? Object.keys(teamColors).map((team) => ({ value: team, label: team })) : [{ value: POuid[1], label: POuid[1] }]}
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
              onChange={POuid === null ? handleTeamChange : () => {}}
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
          {POuid === null &&
            <div className="form-group">
              <label><b>Upload Save File</b></label>
              <input type="file" accept=".json" onChange={uploadDataFromJson} />
            </div>
          }
          {/*Zoom*/}
          <br/>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <Icon icon="heroicons-solid:magnifying-glass-plus" width="30" height="30"/>
          </div>
        </div>
      )}
      {/*Nodi ed archi*/}
      <div className='zoom-zone' style={{transform: `scale(${zoom})`}}>
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
              TeamLeader = {POuid? POuid[1] : null}
              zoom={zoom}
            />: null
          ))}
          </div>   
      </div>
      <Lines nodes={arcs} newArc={newArc} prospective={prospective} isChecked={isCheckboxChecked} TeamLeader={POuid? POuid[1] : null}
          onDeleteArc={onDeleteArc} zoom={zoom}/>

        {/*dialog di modifica*/}
        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={updateService}
          service={dialogService}
          currentSmells={currentSmells}
          TeamLeader={POuid? POuid[1] : null}
        />
        {/*dialog di conferma eliminazione */}
        {isConfirmDialogOpen && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <div className="confirm-dialog-message">
                Are you sure you want to delete this service?
              </div>
              <hr style={{width:"100%"}}/><br/>
              <div className="confirm-buttons">
                <button className="confirm-button-yes" onClick={confirmDelete}>Yes</button>
                <button className="confirm-button-no" onClick={() => setIsConfirmDialogOpen(false)}>No</button>
              </div>
            </div>
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
        {/*dialog per upload */}
        {uploadDialogOpen && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <div className="confirm-dialog-message">
                You are currently logged in, uploading a file will replace the previous one, proceed?
              </div>
              <hr style={{width:"100%"}}/><br/>
              <div className="confirm-buttons">
                <button className="confirm-button-yes" onClick={() => {loadData(loadedData.current, true); setUploadDialogOpen(false)}}>Yes</button>
                <button className="confirm-button-no" onClick={() => setUploadDialogOpen(false)}>No</button>
              </div>
            </div>
          </div>
        )}
        {/*non posso eliminare il nodo */}
        {nodeRejectionDialog && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <div className="confirm-dialog-message">
                You cannot delete a service that communicates with other teams.
              </div>
              <hr style={{width:"100%"}}/><br/>
              <div className="confirm-buttons">
                <button className="confirm-button-no" onClick={() => setNodeRejectionDialog(false)}>ok</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}