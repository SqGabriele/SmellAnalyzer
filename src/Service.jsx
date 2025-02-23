import React, { useState } from "react";

function Service({ id, x, y, color , name, team, onDelete, smells, onPositionChange}) {
  const [position, setPosition] = useState({ x, y });   //la posizione
  const [isDragging, setIsDragging] = useState(false);  //il dragging

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

    // Cleanup 
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]); //chiamata ogni volta che isDragging cambia

  //elimiza il service 
  const handleDelete = () => {
    onDelete(id); // Notifica il genitore di eliminare il servizio
  };

  const style = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: '150px',
    height: '150px',
    backgroundColor: color,
    cursor: 'move'
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

  return <div style={style} onMouseDown={handleMouseDown}>
      <button style={buttonStyle} onClick={handleDelete}>X</button>
      <p>Service: {name}</p>
      <p>Team: {team}</p>
      <p>Smell: {smells.length}</p>
    </div>;
}

export default Service;