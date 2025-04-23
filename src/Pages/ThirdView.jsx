import { Link, useLocation } from "react-router-dom";
import { Icon } from '@iconify/react';
import Select from "react-select";
import Xarrow from 'react-xarrows';
import { useEffect, useState } from "react";

export function ThirdView({page, setPage}) {
    const location = useLocation();
    const data = location.state?.data;
    const smellList = data.currentSmells;
    const [selectedTeams, setSelectedTeams] = useState(data.teamAffected || []); //per la prospettiva
    const [selectedTeams2, setSelectedTeams2] = useState(data.team); //per i team affetti
    const [refactorTree, setRefactorTree] = useState({});
    const [urgency, setUrgency] = useState(data.urgency);
    const [effort, setEffort] = useState(data.urgency);

    //chatbot
    useEffect(() => {
        if (!page.done) {
          if (page.type === "effort") {data.effort = page.content; setEffort(page.content);}
          else if (page.type === "urgency") {data.urgency = page.content; setUrgency(page.content);}
          else if (page.type === "team" && data.teamColors[page.content]) setSelectedTeams([{value: page.content, label: page.content}]);
      
          setPage(prev => ({ ...prev, done: true }));
        }
      }, [page]);

    //crea l'albero "logico"
    useEffect(()=>{
        const tree ={};
        for(let s of data.services){
            const refact = getRefactor(s)
            if(refact === "empty")
                continue;
            const affected = getTeamConnected(s);
            //se non è nei team selezionati o tra quelli afflitti
            if(!(selectedTeams.some((x)=>(s.team===x.value)) || isTeamAfflicted(affected)))
                continue;
            const serviceNode = {name: s.name, refactoring: refact, attributes: getAttributes(s), teamAffected: affected, key: s.key, relevance: s.relevance};
            
            //lo inserisco nell'albero
            if(tree[s.team] === undefined)
                tree[s.team] = [serviceNode];
            else
            tree[s.team].push(serviceNode);
        }
        setRefactorTree(tree);
    }, [selectedTeams, selectedTeams2, urgency, effort]);

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
        }
    }

    //restituisce un oggetto con chiave qualityAttributes e valore una coppia [urgency, lista di refactoring]
    const getAttributes = (service) =>{
        const attrb = {};
        for(let s of service.smellsInstances){
            const eff = 2-stringToIntEffort(s.effort);
            const impact = 6-stringToIntImpact(s.impact);
            if(eff < effort[0] || eff > effort[1])
                continue;
            if(impact < urgency[0] || impact > urgency[1])
                continue; 
            const smell = smellList[s.smell];
            for(let qA of smell.qualityAttributes){
                if(attrb[qA] === undefined)
                    attrb[qA] = [s.originalImpact, smell.refactoring];
                else{
                    if(stringToIntOGImpact(attrb[qA][0]) < stringToIntOGImpact(s.originalImpact))
                        attrb[qA][0] = s.originalImpact;
                    attrb[qA][1] = attrb[qA][1].concat(smell.refactoring);
                } 
            }
        }
        return attrb;
    }

    //prende tutti i refactor di un servizio in un oggetto, con valore la sua urgency
    const getRefactor = (service) =>{
        const attrb = {};
        let isEmpty = true;
        for(let s of service.smellsInstances){
            const eff = 2-stringToIntEffort(s.effort);
            const impact = 6-stringToIntImpact(s.impact);
            if(eff < effort[0] || eff > effort[1])
                continue;
            if(impact < urgency[0] || impact > urgency[1])
                continue;
            isEmpty = false; //assumo che ogni smell abbia un refactor
            const smell = smellList[s.smell];
            for(let ref of smell.refactoring){
                if(attrb[ref] === undefined){
                    attrb[ref] = [2]
                    attrb[ref][0] = s.impact;
                    attrb[ref][1] = s.effort;
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
    const getTeamConnected = (service) =>{
        return new Set([
            ...data.arcs
            .filter(arc => arc[0]?.name === service.name && arc[1]?.team !== service.team) 
            .map(arc => arc[1].team)])
    };

    //controlla che un team sia tra quelli affetti
    const isTeamAfflicted = (affected) =>{
        if(selectedTeams2.some((x)=>(affected.has(x.value))))
            return true;
        return false;
    };

    return(
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
                    <div><Link to="/" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:rectangle-group" /></Link></div>
                    <div><Link to="/smellsPriority" style={{color:'#ffffff'}} state={{ data: data}}><Icon icon="heroicons-solid:table-cells" /></Link></div>
                    <div style={{color:'#a0a0a0'}}><Icon icon="heroicons-solid:magnifying-glass-plus" /></div>
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
                                    return(
                                    <div key={service.key}>
                                        <div key={">"+service.key} className="tree">
                                            <div className="tree-column">
                                                <div key={service.name + ""+service.key} id={`service-${service.key}`} className="tree-cell" style={{backgroundColor:data.teamColors[team]}}> {service.name}<br/><b>Relevance: </b>{service.relevance}<br/>
                                                {
                                                    (() => {
                                                        const affectedTeam = [...service.teamAffected];
                                                        if (affectedTeam.length === 0) return null;
                                                        return (
                                                            <>
                                                                <b>Team Affected:</b><br />
                                                                {affectedTeam.map((x, index) => (
                                                                    <label key={index}>{x}</label>
                                                                ))}
                                                            </>
                                                        );
                                                    })()
                                                }
                                                </div>
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
                                        </div>
                                        {/* freccia da team a servizio*/}
                                        <Xarrow
                                            key={`arrow-${team}-${service.key}`}
                                            start={`team-${team}`}
                                            end={`service-${service.key}`}
                                            strokeWidth={2}
                                            color="black"
                                            path="grid"
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
                                                        path="grid"
                                                        showHead={false}
                                                    />
                                                    {/*frecce da attributi a refactors*/}
                                                    {service.attributes[attr][1].map((ref) => (
                                                        <Xarrow
                                                            key={`arrow-attr-ref-${service.key}-${attr}-${ref}`}
                                                            start={`attr-${service.key}-${attr}`}
                                                            end={`ref-${service.key}-${ref}`}
                                                            strokeWidth={2}
                                                            color="black"
                                                            path="grid"
                                                            showHead={false}
                                                        />
                                                        ))}
                                                </div>)
                                            )}
                                    </div>)
                                })
                            }
                        </div>
                    </div>
                )}
            )}
        </div>
    );
}