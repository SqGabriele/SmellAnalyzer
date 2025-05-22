import React, { useState, useRef, useEffect } from "react";
import { Icon } from '@iconify/react';
import nlp from "compromise";

export function ChatBot({setPage, teamForChatBot,serviceForChatBot, POuid, tree}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi, how can I help you?" }]);
  const [input, setInput] = useState(""); 
  const messagesEndRef = useRef(null); //riferimento per autoscroll
  const state = useRef(null); //FSM
  const generatingTeam = useRef([null,null]); //nome, team
  const generatingLink = useRef([null,null]); //nome1, nome2
  const waiting = useRef(false); //sincronizzazione con thirdview

  //suggerimenti
  useEffect(()=>{
    const response = async() =>{
      if(waiting.current){
        waiting.current =false;
        const services = [];

        //per ogni servizio di ogni team
        let maxUrgency = "None";
        for(let team of Object.keys(tree)){
          for(let serv of tree[team]){
            services.push(serv);
            //prendo la maxUrgency
            for(let ref of Object.keys(serv.refactoring)){
              if(stringToIntImpact(serv.refactoring[ref][0]) > stringToIntImpact(maxUrgency))
                maxUrgency = serv.refactoring[ref][0];
            }
          }
        }
        if(services.length>0)
          setTimeout(() => {setMessages(prev => [...prev, { from: "bot", text: "Here are the most important ones:" }]);}, 1000);

        //stampo solo quelli con maxUrgency
        for(let serv of services){
          for(let ref of Object.keys(serv.refactoring)){
            if(serv.refactoring[ref][0] === maxUrgency){
              await new Promise(resolve => setTimeout(resolve, 1500));
              setTimeout(() => {setMessages(prev => [...prev, { from: "bot", text: ref+" for the service "+serv.name+ " with "+ serv.refactoring[ref][1]}]);}, 0);
            }
          }
        }
      }
    }
    response();
  },[tree]);

  const handleSend = () => { //invia il messaggio
    if (input.trim() === "") return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");

    //risposta
    const intent = parseIntent(input)
    const response = handleIntent(intent)
    setTimeout(() => {setMessages(prev => [...prev, { from: "bot", text: response }]);}, 500);
  };

  const findTeamInText = (text) => {
    //cerco team
    const words = text.toLowerCase().split(/\W+/);
    let matchedTeam = Object.keys(teamForChatBot.current).find(team =>
      words.includes(team)
    );
    //se non lo trovo così come è provo lowercase
    if(matchedTeam === undefined){
      matchedTeam = Object.keys(teamForChatBot.current).find(team =>
        words.includes(team.toLowerCase()));
    }
    return matchedTeam;
  }

  const findServiceInText = (text) => {
    //cerco service
    let matchedService = serviceForChatBot.current.find(serv =>
      text.includes(serv.name)
    );
    //se non lo trovo così come è provo lowercase
    if(matchedService === undefined){
      matchedService = serviceForChatBot.current.find(serv =>
        text.toLowerCase().includes(serv.name.toLowerCase()));
    }
    if(POuid !== null && matchedService.team !== POuid[1])
      return "notmyteam";
    return matchedService.name;
  }

  //interpreta i messaggi
  const parseIntent = (text) => {
    const doc = nlp(text.toLowerCase());

    //ero in uno stato
    if(state.current !== null){
      const res = state.current(doc, nlp(text));
      if(res) return res;
    }

    //new service
    if(doc.match("(do|suggest|help)").found){
      //cerco team
      const matchedTeam = findTeamInText(text); 
      if (matchedTeam) 
        return {intent: "suggest", params: { field: "team", value: matchedTeam }};
      return {intent: "suggest", params: { field: "generic"}};
    }

    //new service
    if(doc.match("(generate|create|make|new) (service|node)").found)
      return {intent: "generate", params: { field: "service"}};

    //remove service
    if(doc.match("(remove|delete|cancel|destroy) (service|node)").found)
      return {intent: "remove_service", params: { field: "service"}};

    //new link
    if(doc.match("(generate|create|make|new) (link|connection|bond|arc)").found)
      return {intent: "link", params: { field: "link"}};

    //remove link
    if(doc.match("(remove|delete|cancel|destroy) (link|connection|bond|arc)").found)
      return {intent: "remove_link", params: { field: "link"}};

    //effort
    if(doc.match("(effort|work|tasks)").found){
      if (doc.match("(low|easy|simple)").found){
        return {
          intent: "set_filter",
          params: { field: "effort", value: "low", operation: "set" },
        };
      }
      if (doc.match("(high|hard|difficult)").found){
        return {
          intent: "set_filter",
          params: { field: "effort", value: "high", operation: "set" },
        };
      }
      if (doc.match("(medium|average|normal)").found){
        return {
          intent: "set_filter",
          params: { field: "effort", value: "medium", operation: "set" },
        };
      }
    }
    
    //urgency
    if(doc.match("(urgency|priority)").found){
      const textLower = doc.text().toLowerCase();
      const upTo = textLower.includes("up to"); //se chiedo "from" priority

      const urgency = ["medium to high", "low to medium", "none to Low", "high", "medium", "low", , "none"];
      const currUrgency = urgency.find(parola => textLower.includes(parola));
      return {
        intent: "set_filter",
        params: { field: "urgency", value: currUrgency, operation: upTo? "range":"set" },
      };
    }

    //voglio i refactor di un team
    if (doc.match("(refactors|refactoring|refactor|smells|smell|problems|problem)").found) {
      //cerco team
      const matchedTeam = findTeamInText(text); 
      if (matchedTeam) {
        return {
          intent: "set_filter",
          params: { field: "team", value: matchedTeam }
        };
      }
      else if(doc.match("(all|every|whole)").found){ //tutti
        return  { intent: "set_filter", params: {field: "team", value: "all" }};
      }
      else{ //non ho capito
        return { intent: "set_filter", params:"wrong team" };
      }  
    }
    else{ //metti la prima vista
      const matchedTeam = findTeamInText(text);
      if(matchedTeam){
        if(doc.match("(also|add|too)").found) //è un also
          return { intent: "first_view", params: { field: "teamAdd", value: matchedTeam } };
        return { intent: "first_view", params: { field: "team", value: matchedTeam } };
      }  
      else if(doc.match("(all|every|whole)").found) //tutti
        return  { intent: "first_view", params: {field: "team", value: "all" }};
    }

  return { intent: "unknown" };
  };

  //esegue la funzione
  const handleIntent = ({ intent, params }) => {
    let message = "Here are the refactors";
    let newPage;
    switch (intent) {
      //terza vista
      case "set_filter":
        newPage = {
          page: 3,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };

        if (params.field === "effort") {
          switch (params.value) {
            case "low": newPage.content = [2, 2]; break;
            case "medium": newPage.content = [1, 1]; break;
            case "high": newPage.content = [0, 0]; break;
          }
          message = 'Here are the '+params.value+'-effort refactorings';
        } 
        else if (params.field === "urgency") {
          switch (params.value) {
            case "high": newPage.content = [0, 0]; break;
            case "medium to high": newPage.content = [1, 1]; break;
            case "medium": newPage.content = [2, 2]; break;
            case "low to medium": newPage.content = [3, 3]; break;
            case "low": newPage.content = [4, 4]; break;
            case "none to low": newPage.content = [5, 5]; break;
            case "none": newPage.content = [6, 6]; break;
          }
          message = 'Here are the '+params.value+'-urgency refactorings. You can also try "Show refactors up to medium urgency"';
          if(params.operation === "range"){
            newPage.content[0] = 0;
            message = 'Here are the refactorings of at least '+params.value+'-urgency';
          } 
        } 
        else if (params.field === "team") {
          //potrei non avere i permessi
          if(POuid!==null && POuid[1] !== params.value)
            return "You don't have permission to see that team. Just try "+'"Show me avaible refactors"';

          message = "Here are the refactorings of the "+params.value+" team";
          if(params.value === "all")
            message = "Here are the refactorings of all the teams";
          newPage.content = params.value;
        }
        else if(params === "wrong team"){
          message = 'Here are the refactors, you can also specify a team: "Show me team red refactors"';
        }
        
        setPage(newPage);
        return message;
      
      //prima vista
      case "first_view":
        newPage = {
          page: 1,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };

        if (params.field === "team") {
          //potrei non avere i permessi
          if(POuid!==null && POuid[1] !== params.value)
            return "You don't have permission to see that team";

          newPage.content = params.value;
          message = 'Here is the '+ params.value +' team, do you also want to see the services it interacts with?';
          if(params.value === "all")
            message = "Here are all the teams";
          else
            state.current = Interaction;
        }
        else if (params.field === "teamAdd") {
          if(POuid!==null && POuid[1] !== params.value)
            return "You don't have permission to see that team";

          newPage.content = params.value;
          message = 'I added team "'+ params.value +'" to the view, do you also want to see the services it interacts with?';
          state.current = Interaction;
        }
        else if (params.field === "team_interaction") {
          if(params.value === "no")
            return 'Okay, let me know if you need anything else. You can also add teams to the view: "Also show red team"';
          else
            message = 'Here you go. You can also try with "Show me all teams"';
        } 
        
        setPage(newPage);
        return message;
      
      //creo un nodo (prima vista)
      case "generate":
        newPage = {
          page: 1,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };
        if(params.field === "service"){
          message = "Want to create a new service? Great! What do you want it to be called?";
          state.current = NewService1;
        }
        else if(params.field === "name"){ //creazione servizio
          generatingTeam.current[0] = params.value;
          //se sono team leader non chiedo il team
          if(POuid!==null){
            generatingTeam.current[1] = POuid[1];
            message = '"'+params.value+'"? Sure. Do you want to create "'+generatingTeam.current[0]+'" of team "'+generatingTeam.current[1]+'"?';
            state.current = NewService3;
          }
          else{
            message = '"'+params.value+'"? Okay. What team is he on?';
            state.current = NewService2;
          } 
        }
        else if(params.field === "team"){
          generatingTeam.current[1] = params.value;
          if(params.exists)
            message = '"'+params.value+'"? Sure. Do you want to create "'+generatingTeam.current[0]+'" of team "'+params.value+'"?';
          else
            message = '"'+params.value+'"? This team does not exist, I will create it. Do you want to create "'+generatingTeam.current[0]+'" of team "'+params.value+'"?';
          state.current = NewService3;
        }
        else if(params.field === "confirm"){
          if(params.value === "no"){
            return "Okay, let me know if you need anything else";
          }
          message = 'Here you go. If you want I can also connect it to other services "Generate link" or delete it "Delete this node".';
          setPage(newPage);
          newPage.content = generatingTeam.current;
          newPage.type = "generating_node";
        }
        setPage(newPage);
        return message;
      
      //rimuovo un nodo (prima vista)
      case "remove_service":
        newPage = {
          page: 1,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };
        if(params.field === "service"){
          message = "Do you want to remove a service? Which one?";
          state.current = RemoveService1;
        }
        else if(params.field === "notfound"){
          message = "It seems that this service does not exist";
          state.current = null;
        }
        else if(params.field === "notmyteam"){
          message = "As team leader, you can only remove services in your team";
          state.current = null;
        }
        else if(params.field === "found"){
          generatingTeam.current[0] = params.value;
          message = 'Okay, are you sure you want to remove team "'+params.value+'"?';
          state.current = RemoveService2;
        }
        else if(params.field === "confirm"){
          if(params.value === "no"){
            return "Okay, let me know if you need anything else";
          }
          message = 'Done. Let me know if you need anything else.';
          newPage.content = generatingTeam.current;
          newPage.type = "remove_service";
        }

      setPage(newPage);
      return message;

      //genera link
      case "link":
        newPage = {
          page: 1,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };

        if(params.field === "link"){
          message = "Want to create a new link? Select the first service";
          state.current = NewLink1;
        }
        else if(params.field === "notfound"){
          message = "It seems that this service does not exist";
          state.current = null;
        }
        else if(params.field === "notmyteam"){
          message = "As team leader, you can only create arcs between services in your team";
          state.current = null;
        }
        else if(params.field === "found"){
          generatingLink.current[0] = params.value;
          message = "Got it, service "+params.value+", what about the second one?";
          state.current = NewLink2;
        }
        else if(params.field === "found2"){
          generatingLink.current[1] = params.value;
          message = 'Okay, from service "'+generatingLink.current[0] +'" to "'+params.value+'". To delete this or other links try "Delete link"';
          state.current = null;
          newPage.content = generatingLink.current;
          newPage.type = "generating_link";
        }
        
        setPage(newPage);
        return message;
      
      //rimuovi link
      case "remove_link":
        newPage = {
          page: 1,
          type: params.field,
          content: null,
          done: false,
          doneAsync: true,
        };
        if(params.field === "link"){
          message = "Want to remove a new link? Select the first service";
          state.current = RemoveLink1;
        }
        else if(params.field === "notmyteam"){
          message = "As team leader, you can only remove arcs between services in your team";
          state.current = null;
        }
        else if(params.field === "notfound"){
          message = "It seems that this service does not exist";
          state.current = null;
        }
        else if(params.field === "found"){
          generatingLink.current[0] = params.value;
          message = "Got it, service "+params.value+", what about the second one?";
          state.current = RemoveLink2;
        }
        else if(params.field === "found2"){
          generatingLink.current[1] = params.value;
          message = 'Okay, from service "'+generatingLink.current[0] +'" to "'+params.value+'". Link removed.';
          state.current = null;
          newPage.content = generatingLink.current;
          newPage.type = "remove_link";
        }
        
        setPage(newPage);
        return message;

      //suggerimenti
      case "suggest":
        newPage = {
          page: 3,
          type: "suggest",
          content: null,
          done: false,
          doneAsync: true,
        };
        
        if(POuid!==null){
          newPage.content = POuid[1];
          waiting.current=true;
          message = 'These are all the refactorings currently needed for team '+POuid[1];
        }
        else if (params.field === "generic") {
          waiting.current=true;
          message = 'These are all the refactorings currently needed';
        } 
        else if (params.field === "team") {
          newPage.content = params.value;
          waiting.current=true;
          message = 'These are all the refactorings currently needed for team '+params.value;
        } 
        
        setPage(newPage);
        return message;
          
        
      default:
        return "Sorry, I don't understand, try with: 'What should i do now?'";
    }
  };
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); //autoscroll quando invii un messaggio
  }, [messages]);
  useEffect(() => {
    if(isOpen)
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" }); //autoscroll quando apri
  }, [isOpen]);

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



  //---------STATI---------//

  //per i sì/no
  const binaryChoice = (doc) =>{
    if(doc.match("(yes|ok|okay|yep|sure)").found)
      return "yes";
    else if(doc.match("(no|nope)").found)
      return "no";
    return null;
  }

  //dopo aver mostrato un team chiedo di mostrare anche i team con cui interagisce
  const Interaction = (doc) => {
    state.current = null;
    const ans = binaryChoice(doc);
    if(ans === "yes")
      return { intent: "first_view", params: { field: "team_interaction", value: "yes" } };
    if(ans === "no")
      return { intent: "first_view", params: { field: "team_interaction", value: "no" } };
    return null;
  }

  //creo un nuovo nodo, leggo il nome
  const NewService1 = (doc, docUpperCase) => {
    const serviceName = docUpperCase.text().trim();
    if (!serviceName) 
      return null;
    
    return { intent: "generate", params: { field: "name", value: serviceName } };
  }
  const NewService2 = (doc, docUpperCase) => { //leggo il team
    const matchedTeam = findTeamInText(docUpperCase.text()); 
    if (matchedTeam) return {intent: "generate",params: { field: "team", value: matchedTeam, exists: true }};

    const team = docUpperCase.text().trim();
    if (!team) 
      return null;
    
    return { intent: "generate", params: { field: "team", value: team } };
  }
  const NewService3 = (doc) => { //conferma
    state.current = null;
    const ans = binaryChoice(doc);
    if(ans === "yes")
      return { intent: "generate", params: { field: "confirm", value: "yes" } };
    if(ans === "no")
      return { intent: "generate", params: { field: "confirm", value: "no" } };
    return null;
  }

  //rimuovo un servizio
  const RemoveService1 = (doc) => {
    const matchedService = findServiceInText(doc.text());
    if(matchedService == "notmyteam") return {intent: "remove_service",params: { field: "notmyteam", value: matchedService}};
    if (matchedService) return {intent: "remove_service",params: { field: "found", value: matchedService}};
    
    return {intent: "remove_service",params: { field: "notfound"}};
  }
  const RemoveService2 = (doc) => { //conferma
    state.current = null;
    const ans = binaryChoice(doc);
    if(ans === "yes")
      return { intent: "remove_service", params: { field: "confirm", value: "yes" } };
    if(ans === "no")
      return { intent: "remove_service", params: { field: "confirm", value: "no" } };
    return null;
  }

  //creo un nuovo link, leggo il nome
  const NewLink1 = (doc) => {
    const matchedService = findServiceInText(doc.text());
    if(matchedService == "notmyteam") return {intent: "link",params: { field: "notmyteam", value: matchedService}};
    if (matchedService) return {intent: "link",params: { field: "found", value: matchedService}};
    
    return {intent: "link",params: { field: "notfound"}};
  }
  const NewLink2 = (doc) => {
    const matchedService = findServiceInText(doc.text()); 
    if(matchedService == "notmyteam") return {intent: "link",params: { field: "notmyteam", value: matchedService}};
    if (matchedService) return {intent: "link",params: { field: "found2", value: matchedService}};
    
    return {intent: "link",params: { field: "notfound"}};
  }

  //rimuovo link
  const RemoveLink1 = (doc) => {
    const matchedService = findServiceInText(doc.text()); 
    if(matchedService == "notmyteam") return {intent: "remove_link",params: { field: "notmyteam", value: matchedService}};
    if (matchedService) return {intent: "remove_link",params: { field: "found", value: matchedService}};
    
    return {intent: "remove_link",params: { field: "notfound"}};
  }
  const RemoveLink2 = (doc) => {
    const matchedService = findServiceInText(doc.text()); 
    if(matchedService == "notmyteam") return {intent: "remove_link",params: { field: "notmyteam", value: matchedService}};
    if (matchedService) return {intent: "remove_link",params: { field: "found2", value: matchedService}};
    
    return {intent: "remove_link",params: { field: "notfound"}};
  }

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}>
      {isOpen ? ( 
        //chat aperta
        <div className="chat-container animate-fadeIn">
          <div className="chat-header">
            ChatBot
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✖</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.from}`}>
                <span>{msg.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
            />
            <button onClick={handleSend}>
             <Icon icon="heroicons-solid:paper-airplane" width="16" height="16" style={{ transform: "rotate(90deg)" }}/>
            </button>
          </div>
        </div>
      ) : (
        //chat chiusa
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <Icon icon="heroicons-solid:chat-bubble-left-ellipsis" width="25" height="25" />
        </button>
      )}
    </div>
  );
}