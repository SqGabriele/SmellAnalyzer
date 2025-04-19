import './App.css'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { FirstView } from './Pages/FirstView';
import { SecondView } from './Pages/SecondView';
import { ThirdView } from './Pages/ThirdView';

function App() {
  
  return(
    <Router>
      <Routes>
        <Route path="/" element={<FirstView/>}/>
        <Route path="/smellsPriority" element={<SecondView/>}/>
        <Route path="/refactoring" element={<ThirdView/>}/>
      </Routes>
    </Router>
  )
}

export default App;
