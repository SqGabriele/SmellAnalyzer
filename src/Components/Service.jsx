import React, { useState, useRef, useEffect } from "react";
import "../style.css";

function Service({ id, x, y, color , name, team, onDelete, smells, onPositionChange, updateRectSize, onOpenSecondView}) {
  const [position, setPosition] = useState({ x, y });   //la posizione
  const [isDragging, setIsDragging] = useState(false);  //il dragging
  const serviceRef = useRef(null)

  useEffect(() => {
    if (serviceRef.current) {
      const { width, height } = serviceRef.current.getBoundingClientRect();
      updateRectSize(id,{ width, height })
    }
  }, []);

  //logica per il drag&drop
  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - 75;
      const newY = e.clientY - 75;
      setPosition({ x: newX, y: newY });

      //Passa la nuova posizione al componente padre
      onPositionChange(id, newX, newY);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]); //chiamata ogni volta che isDragging cambia

  //elimiza il service 
  const handleDelete = () => {
    onDelete(id); //notifica il genitore di eliminare il servizio
  };

  const style = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    minWidth: '150px', 
    minHeight: '150px', 
    backgroundColor: color,
    borderRadius: '10px', 
    cursor: 'move', 
    display: 'flex',
    padding: '5px',
    flexDirection: 'column',
    transition: 'all 0.1s ease',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  const buttonStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'red',
    color: 'white',
    border: 'none',
    width: '25px',
    height: '25px',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '16px'
  };

  const textContainerStyle = {
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  return <div ref={serviceRef} style={style} onMouseDown={handleMouseDown}>
      <button style={buttonStyle} onClick={handleDelete}>X</button>
      {onOpenSecondView()}
      <div style={textContainerStyle}>
        <p><b>Service:</b> {name}</p>
        <p><b>Team:</b> {team}</p>
        <p><b>Smell:</b> {smells.length}</p>
      </div>
    </div>;
}

export default Service;