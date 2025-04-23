import React, { useState, useRef, useEffect } from "react";
import { Icon } from '@iconify/react';
import nlp from "compromise";

export function ChatBot({setPage, teamForChatBot}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi, how can I help you?" }]);
  const [input, setInput] = useState(""); 
  const messagesEndRef = useRef(null); //riferimento per autoscroll

  const handleSend = () => { //invia il messaggio
    if (input.trim() === "") return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");

    //risposta
    const intent = parseIntent(input)
    const response = handleIntent(intent)
    setTimeout(() => {setMessages(prev => [...prev, { from: "bot", text: response }]);}, 500);
  };

  //interpreta i messaggi
  const parseIntent = (text) => {
    const doc = nlp(text.toLowerCase());

    //effort
    if (doc.match("(low|easy|simple|) (effort|work|tasks)").found) {
      return {
        intent: "set_filter",
        params: { field: "effort", value: "low", operation: "set" },
      };
    }
    if (doc.match("(high|hard|difficult) (effort|work|tasks)").found) {
      return {
        intent: "set_filter",
        params: { field: "effort", value: "high", operation: "set" },
      };
    }
    if (doc.match("(edium|average|normal) (effort|work|tasks)").found) {
      return {
        intent: "set_filter",
        params: { field: "effort", value: "medium", operation: "set" },
      };
    }
    //urgency
    if (doc.match("(medium|average|normal) (urgency|priority)").found) {
      return {
        intent: "set_filter",
        params: { field: "urgency", value: "medium", operation: "set" },
      };
    }
    if (doc.match("(high|urgent|important) (urgency|priority)").found) {
      return {
        intent: "set_filter",
        params: { field: "urgency", value: "high", operation: "set" },
      };
    }

    if (doc.match("(low|not urgent|easy) (urgency|priority)").found) {
      return {
        intent: "set_filter",
        params: { field: "urgency", value: "low", operation: "set" },
      };
    }

    if (text.toLowerCase().includes("team")) {
      const matchedTeam = Object.keys(teamForChatBot.current).find(team =>
        text.includes(team)
      );
  
      if (matchedTeam) {
        return {
          intent: "set_filter",
          params: { field: "team", value: matchedTeam }
        };
      }
      else return { intent: "wrong team" };
    }

    return { intent: "unknown" };
  };

  //esegue la funzione
  const handleIntent = ({ intent, params }) => {
    switch (intent) {
        case "set_filter":
            let newPage = {
            page: 3,
            type: params.field,
            content: null,
            done: false,
          };
  
          if (params.field === "effort") {
            switch (params.value) {
              case "low": newPage.content = [2, 2]; break;
              case "medium": newPage.content = [1, 1]; break;
              case "high": newPage.content = [0, 0]; break;
            }
          } 
          else if (params.field === "urgency") {
            switch (params.value) {
              case "high": newPage.content = [0, 0]; break;
              case "medium to high": newPage.content = [0, 1]; break;
              case "medium": newPage.content = [0, 2]; break;
              case "low to medium": newPage.content = [0, 3]; break;
              case "low": newPage.content = [0, 4]; break;
              case "none to low": newPage.content = [0, 5]; break;
              case "none": newPage.content = [0, 6]; break;
            }
          } 
          else if (params.field === "team") {
            newPage.content = params.value;
          }
  
          setPage(newPage);
          return "Here are the refactors";
      
      case "wrong team":
        return "Sorry there is no team with that name";
      default:
          return "Sorry, I don't understand, try with: 'Show high priority refactorings'";
    }
  };
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); //autoscroll quando invii un messaggio
  }, [messages]);
  useEffect(() => {
    if(isOpen)
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" }); //autoscroll quando apri
  }, [isOpen]);

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}>
      {isOpen ? ( 
        //chat aperta
        <div className="chat-container animate-fadeIn">
          <div className="chat-header">
            ChatBot Beta
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