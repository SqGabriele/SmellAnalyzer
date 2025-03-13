import './App.css'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { FirstView } from './Pages/FirstView';
import { SecondView } from './pages/SecondView';

function App() {
  
  return(
    <Router>
      <Routes>
        <Route path="/" element={<FirstView/>}/>
        <Route path="/smellsPriority" element={<SecondView/>}/>
      </Routes>
    </Router>
  )
}

export default App;
