import React, { useState, useRef, useEffect } from "react";
import { Icon } from '@iconify/react';
import "../style.css";

function Service({ id, x, y, color , name, team, onDelete, smells, onPositionChange, updateRectSize, onGenerateArc, isGeneratingNewArc, addArc, onOpenDialog}) {
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
  const handleMouseDown = () => {
    if(isGeneratingNewArc.current === true)
      addArc(id);
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
    onDelete(id, team); //notifica il genitore di eliminare il servizio
  };

  const newArc = () => {
    onGenerateArc(id);
  };

  const openDialog = () => {
    onOpenDialog(id);
  };

  return <div ref={serviceRef}
          className="service-container noselect" style={{ left: `${position.x}px`, top: `${position.y}px`, backgroundColor: color }} onMouseDown={handleMouseDown} >
      <button className="service-button delete" onClick={handleDelete}>X</button>
      <button className="service-button arc" onClick={newArc}>
        <Icon icon="heroicons-solid:arrow-trending-up" />
      </button>
      <button className="service-button dialog" onClick={openDialog}>
        <Icon icon="heroicons-solid:bars-3-bottom-left" />
      </button>
      <div className="service-text-container">
        <p><b>Service:</b> {name}</p>
        <p><b>Team:</b> {team}</p>
        <p><b>Smell:</b> {smells.length}</p>
      </div>
    </div>;
}

export default Service;