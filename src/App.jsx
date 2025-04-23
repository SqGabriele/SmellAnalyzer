import './App.css'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useRef, useState } from "react";
import { FirstView } from './Pages/FirstView';
import { SecondView } from './Pages/SecondView';
import { ThirdView } from './Pages/ThirdView';
import { ChatBot } from './Components/ChatBot';

function App() {
  const [page, setPage] = useState({done:true, type:null, page:1, content:null}); //usato per navigare dal chatbot
  const teamForChatBot = useRef([]);
  return(
    <Router>
      <Routes>
        <Route path="/" element={<FirstView page = {page} setPage={setPage} teamForChatBot={teamForChatBot} />}/>
        <Route path="/smellsPriority" element={<SecondView page = {page} setPage={setPage}/>}/>
        <Route path="/refactoring" element={<ThirdView page = {page} setPage={setPage}/>}/>
      </Routes>
      <ChatBot setPage={setPage} teamForChatBot={teamForChatBot} />
    </Router>
  )
}

export default App;
