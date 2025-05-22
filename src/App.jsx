import './App.css';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useRef, useState } from "react";
import { Login } from './Pages/Login';
import { ManageAccounts } from './Pages/ManageAccounts';
import { FirstView } from './Pages/FirstView';
import { SecondView } from './Pages/SecondView';
import { ThirdView } from './Pages/ThirdView';
import { ChatBot } from './Components/ChatBot';

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [page, setPage] = useState({ done: true, type: null, page: 1, content: null, doneAsync:true });
  const teamForChatBot = useRef([]);
  const serviceForChatBot = useRef([]);
  const location = useLocation();
  const [uid, setUid] = useState(() => {
    const stored = localStorage.getItem("POuid");
    return stored ? JSON.parse(stored) : null;
  });
  const [tree, setTree] = useState(null);

  return (
    <>
      <Routes>
        <Route path="/" element={<Login setUid={setUid} />}/>
        <Route path="/manageAccounts" element={<ManageAccounts />} />
        <Route path="/graph" element={<FirstView page={page} setPage={setPage} teamForChatBot={teamForChatBot} serviceForChatBot={serviceForChatBot} POuid={uid} />} />
        <Route path="/smellsPriority" element={<SecondView page={page} setPage={setPage} POuid={uid} />} />
        <Route path="/refactoring" element={<ThirdView page={page} setPage={setPage} POuid={uid} setTree={setTree} teamForChatBot={teamForChatBot} />} />
      </Routes>

      {/*mostra il chatbot solo se NON sei nella login */}
      {location.pathname !== "/" && location.pathname !== "/manageAccounts"  && (
        <ChatBot setPage={setPage} teamForChatBot={teamForChatBot} serviceForChatBot={serviceForChatBot}  POuid={uid} tree={tree}/>
      )}
    </>
  );
}

export default AppWrapper;
