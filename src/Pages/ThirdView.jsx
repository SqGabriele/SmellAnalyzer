import { Link, useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import Select from "react-select";
import Xarrow from 'react-xarrows';
import { useEffect, useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import refactorDefault from '../Config/Refactor.json';
import { useNavigate } from "react-router-dom";

export function ThirdView({page, setPage, POuid, setTree, teamForChatBot}) {
    const navigate = useNavigate();
    const location = useLocation();
    const data = location.state?.data;
    const smellList = data.currentSmells;
    const [selectedTeams, setSelectedTeams] = useState(data.teamAffected || []); //per la prospettiva
    const [refactorTree, setRefactorTree] = useState({});
    const [urgency, setUrgency] = useState(data.urgency);
    const [effort, setEffort] = useState(data.effort);
    const refactorFile = useRef(null);
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const waitingForTree = useRef(0);

    //carica file dei refacotr
    useEffect(() => {
        try {
            refactorFile.current = refactorDefault;
        } catch (error) {
            console.error("Error loading JSON data:", error);
        }
    }, []);   
    
    //crea l'albero "logico"
    useEffect(()=>{
        const tree ={};
        for(let s of data.services){
            const refact = getRefactor(s)
            if(refact === "empty")
                continue;
            const [affected, affects] = getTeamConnected(s, refact);
            //se non è nei team selezionati o tra quelli afflitti
            if(!(selectedTeams.some((x)=>(s.team===x.value))))
                continue;
            const serviceNode = {name: s.name, refactoring: refact, attributes: getAttributes(s), teamAffectedBy: affected, teamThatAffects: affects, key: s.key, relevance: s.relevance};
            
            //lo inserisco nell'albero
            if(tree[s.team] === undefined)
                tree[s.team] = [serviceNode];
            else
                tree[s.team].push(serviceNode);
        }
        if(waitingForTree.current == 1)
            waitingForTree.current =2;
        setRefactorTree(tree);
        setIsDataLoaded(true);
    }, [selectedTeams, urgency, effort]);

    //chatbot
    useEffect(() => {
        if (!page.done) {
            if (page.type === "effort") {data.effort = page.content; setEffort(page.content);}
            else if (page.type === "urgency") {data.urgency = page.content; setUrgency(page.content);}
            else if (page.type === "team" && (data.teamColors[page.content] || page.content === "all")){
                let selTeam;
                if(page.content !== "all")
                    selTeam = [{value: page.content, label: page.content}];
                else 
                    selTeam = Object.keys(data.teamColors).map((team) => ({ value: team, label: team }));
                if(page.page === 1)
                    data.checkboxOption = false;
                setSelectedTeams(selTeam);
                data.teamAffected = selTeam;
            }
            else if (page.type === "teamAdd" && (data.teamColors[page.content])){
                data.teamAffected = selectedTeams;
                data.teamAffected.push({ value: page.content, label: page.content });
                data.checkboxOption = false;
            }
            else if(page.type === "team_interaction")
                data.checkboxOption = true;
            else if(page.type === "generating_node" || page.type === "generating_link" || page.type === "remove_link" || page.type === "remove_service")
                setPage(prev => ({ ...prev, doneAsync: false, done:true }));
            else if(page.type === "suggest"){
                let selTeam;
                if(page.content===null)
                    selTeam = Object.keys(data.teamColors).map((team) => ({ value: team, label: team }));
                else
                    selTeam = [{ value: page.content, label: page.content }];
                waitingForTree.current++;
                data.teamAffected = selTeam;
                setSelectedTeams(selTeam);
            }

            if (page.page === 1) 
                navigate("/graph", { state: { data: data } });
      
            setPage(prev => ({ ...prev, done: true }));
        }
        else if(!page.doneAsync && isDataLoaded){
            if(page.type === "suggest"){
                let selTeam;
                if(page.content===null)
                    selTeam = Object.keys(data.teamColors).map((team) => ({ value: team, label: team }));
                else
                    selTeam = [{ value: page.content, label: page.content }];
                waitingForTree.current++;
                data.teamAffected = selTeam;
                setSelectedTeams(selTeam);
            }
        }
      }, [page, isDataLoaded]);

    //funzione di supporto
    useEffect(()=>{
        if(waitingForTree.current === 2){
            waitingForTree.current = false;
            setTree(refactorTree); //passo l'albero
        }
    },[refactorTree]);

    const stringToIntOGImpact = (string) =>{
        switch(string){
            case "None": return 0;
            case "Low": return 1;
            case "Medium": return 2;
            case "High": return 3;
        }
    }

    const stringToIntImpact = (string) =>{
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

    const stringToIntEffort = (string) =>{
        switch(string){
            case "Low effort": return 0;
            case "Medium effort": return 1;
            case "High effort": return 2;
            case "To define": return 2;
        }
    }

    //restituisce un oggetto con chiave qualityAttributes e valore una coppia [urgency, lista di refactoring]
    const getAttributes = (service) =>{
        const attrb = {};
        for(let s of service.smellsInstances){
            const impact = 6-stringToIntImpact(s.impact);
            if(impact < urgency[0] || impact > urgency[1])
                continue; 
            const smell = smellList[s.smell];
            for(let qA of smell.qualityAttributes){
                const arr = smell.refactoring.filter(x => !(s.effort[x] == "To define" || 2-stringToIntEffort(s.effort[x]) < effort[0] || 2-stringToIntEffort(s.effort[x]) > effort[1]));
                if(arr.length===0)
                    continue;
                if(attrb[qA] === undefined)
                    attrb[qA] = [service.attributes[qA] || "None", arr];
                else
                    attrb[qA][1] = attrb[qA][1].concat(arr);
            }
        }
        return attrb;
    }

    const handleLogout = async () => {
        try {
        await signOut(auth);
        navigate("/"); // torna alla pagina di login
        } catch (err) {
        console.error("Logout failed:", err);
        }
    };

    //prende tutti i refactor di un servizio in un oggetto, con valore la sua urgency
    const getRefactor = (service) =>{
        const attrb = {};
        let isEmpty = true;
        for(let s of service.smellsInstances){
            const impact = 6-stringToIntImpact(s.impact);
            if(impact < urgency[0] || impact > urgency[1])
                continue;
            const smell = smellList[s.smell];
            for(let ref of smell.refactoring){
                if(s.effort[ref] == "To define" || 2-stringToIntEffort(s.effort[ref]) < effort[0] || 2-stringToIntEffort(s.effort[ref]) > effort[1])
                    continue;
                isEmpty = false; //assumo che ogni smell abbia un refactor
                if(attrb[ref] === undefined){
                    attrb[ref] = [2];
                    attrb[ref][0] = s.impact;
                    attrb[ref][1] = s.effort[ref];
                }
                else{
                    if(stringToIntOGImpact(attrb[ref]) < stringToIntOGImpact(s.impact))
                        attrb[ref][0] = s.impact;
                } 
            }
        }
        if(isEmpty)
            return "empty"
        return attrb;
    }

    //calcola i team connessi ad un servizio
    const getTeamConnected = (service, refactor) =>{
        const interactTo = new Set();
        const interactBy = new Set();

        //per evitare team inutili
        let checkTO = false;
        let checkFROM = false;
        const ref = Object.keys(refactor);
        for (let r of ref) {
            if (refactorFile.current && refactorFile.current[r]) {
                if (refactorFile.current[r].affectOnInteraction)
                    checkTO = true;
                if (refactorFile.current[r].affectOnInteracted)
                    checkFROM = true;
            }
        }

        for(let arc of data.arcs){
            if(checkTO && arc[0]?.name === service.name && arc[1]?.team !== service.team) //arco dal servizio ad un altro team
                interactTo.add(arc[1].team);
            else if(checkFROM && arc[1]?.name === service.name && arc[0]?.team !== service.team) //arco da un altro servizio a te
                interactBy.add(arc[0].team);
        }

        return [interactTo, interactBy];
    };

    //copia i team per il chatbot
    useEffect(()=>{
        teamForChatBot.current = data.teamColors;
    },[])

    return(
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
                        <div> <Link to="/manageAccounts" style={{color:'#ffffff'}} state={{ data: data}}> <Icon icon="heroicons-solid:user-plus" /></Link></div>}
                    <div><Link to="/graph" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:rectangle-group" /></Link></div>
                    <div><Link to="/smellsPriority" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:table-cells" /></Link></div>
                    <div style={{color:'#a0a0a0'}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></div>
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
            <br/><br/><br/><br/>
            {/* Team */}
            {Object.keys(refactorTree).length === 0 && (
                <div className="empty-message">
                    <h2>No refactors to display</h2>
                    <p>Change filters to view available refactors.</p>
                </div>
            )}
            {Object.keys(refactorTree).map(
                (team)=> {
                    return (<div key={team} className="tree"><div id={`team-${team}`} className="tree-cell" style={{backgroundColor:data.teamColors[team]}}> <b>{team}</b> </div>
                        <div className="tree-column">
                            {/* Service */}
                            {refactorTree[team].map((service)=>
                                {  
                                    const allTeams = new Set([...service.teamAffectedBy, ...service.teamThatAffects]); 
                                    return(
                                    <div key={service.key}>
                                        <div key={">"+service.key} className="tree">
                                            <div className="tree-column">
                                                <div key={service.name + ""+service.key} id={`service-${service.key}`} className="tree-cell" style={{backgroundColor:data.teamColors[team]}}> {service.name}<br/><b>Relevance: </b>{service.relevance}<br/></div>
                                            </div>
                                            {/* Quality Attributes */}
                                            <div className="tree-column">
                                            {
                                                Object.keys(service.attributes).map((attributes)=>
                                                    <div key={attributes + ""+service.key} id={`attr-${service.key}-${attributes}`} className="tree-cell" style={{backgroundColor:data.teamColors[team]}}> 
                                                        {attributes}<br/><b>Importance: </b>{service.attributes[attributes][0]} </div>
                                            )}
                                            </div>
                                            {/* Refactors */}
                                            <div className="tree-column">
                                            {
                                                Object.keys(service.refactoring).map((refactor)=>
                                                    <div key={refactor + ""+service.key} id={`ref-${service.key}-${refactor}`} className="tree-cell" style={{backgroundColor:data.teamColors[team]}}>
                                                        {refactor}<br/><b>{"Urgency: "}</b>{service.refactoring[refactor][0]}<br/><b>{"Effort: "}</b>{service.refactoring[refactor][1]} </div>
                                            )}
                                            </div>
                                            {/* Teams */}
                                            <div className="tree-column">
                                            {
                                                (() => {
                                                    if (allTeams.size === 0) return null;
                                                    return (
                                                      [...allTeams].map((teamName) => {
                                                        return(
                                                            <div key={`team-${service.key}-${teamName}`} id={`team-${service.key}-${teamName}`} className="tree-cell-team" style={{ backgroundColor: data.teamColors[teamName] || '#ccc' }}>
                                                                <Icon icon="heroicons-solid:user" style={{width: '60px',height: '60px'}}/><br/>
                                                            <b>Team: </b>{teamName}
                                                            </div>)
                                                    }));
                                                  })()
                                            }
                                            </div>
                                        </div>
                                        {/* freccia da team a servizio*/}
                                        <Xarrow
                                            key={`arrow-${team}-${service.key}`}
                                            start={`team-${team}`}
                                            end={`service-${service.key}`}
                                            strokeWidth={2}
                                            color="black"
                                            path="straight"
                                            showHead={false}
                                            />
                                            {/*frecce da servizio ad attributi*/}
                                            {Object.keys(service.attributes).map((attr) => (
                                                <div key={attr}>
                                                    <Xarrow
                                                        key={`arrow-service-attr-${service.key}-${attr}`}
                                                        start={`service-${service.key}`}
                                                        end={`attr-${service.key}-${attr}`}
                                                        strokeWidth={2}
                                                        color="black"
                                                        path="straight"
                                                        showHead={false}
                                                    />
                                                    {/*frecce da attributi a refactors*/}
                                                    {service.attributes[attr][1].map((ref, indx) => (
                                                        <Xarrow
                                                            key={`arrow-attr-ref-${service.key}-${attr}-${ref}-${indx}`}
                                                            start={`attr-${service.key}-${attr}`}
                                                            end={`ref-${service.key}-${ref}`}
                                                            strokeWidth={2}
                                                            color="black"
                                                            path="straight"
                                                            showHead={false}
                                                        />
                                                        ))}
                                                </div>)
                                            )}
                                            {/*frecce da refactor a team*/}
                                            {Object.keys(service.refactoring).map((ref) => (
                                                <div key={ref}>
                                                    {[...allTeams].map((team) => {
                                                        return(
                                                            (service.teamThatAffects.has(team) && refactorFile.current[ref].affectOnInteracted) ||
                                                            (service.teamAffectedBy.has(team) &&  refactorFile.current[ref].affectOnInteraction)?
                                                            <Xarrow
                                                                key={`arrow-service-attr-${service.key}-${ref}-${team}`}
                                                                start={`ref-${service.key}-${ref}`}
                                                                end={`team-${service.key}-${team}`}
                                                                strokeWidth={2}
                                                                color="black"
                                                                path="straight"
                                                                showHead={false}
                                                            /> : null)
                                                    })}
                                                </div>)
                                            )}
                                    </div>)
                                })
                            }
                        </div>
                    </div>
                )}
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