import React from 'react';
import Header from './Header';
import { connect } from 'redux-zero/react';
import { NavLink } from 'react-router-dom';
import './css/body.css'; 

const InitPage = ({ name, education, bio }) => {
    return (
<div id="page" className="en">
  <div className="container home-page" style={{opacity: 1, transform: "matrix(1, 0, 0, 1, 0, 0)"}}>
    <span className="tags top-tags"> &nbsp;&nbsp;&nbsp;&lt;body&gt;</span>
    <div className="text-zone">
      <h1 aria-label=" Hola, Soy  ydee,web developer." className="blast-root">
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>H</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>o</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>l</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>a</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>,</span><br></br>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>S</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>o</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>y&nbsp;</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>A</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>y</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>d</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>,</span><br></br>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>W</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>b&nbsp;</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>D</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>v</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>l</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>o</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>p</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>r</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>.</span>
      </h1>
      <h2>Front End Developer / Javascript / React / Redux</h2> 
      <NavLink className="flat-button" to={"/contact"}>CONTÁCTAME</NavLink>
      </div>
      <span className="tags bottom-tags"> &nbsp;&nbsp;&nbsp;&lt;/body&gt;<br></br> &lt;/html&gt; </span>
      </div>
      <div className="photohome"></div>
</div>
    )
}

const Home = ({ mydata }) => {  
      const listComponent = mydata.map((item, index) => {
        return <InitPage
          key={index}
          name={item.name}
          education={item.education}
          bio={item.bio}
          index={index}
        />
      })
      return (
        <div>
          <Header />
          <section >
            {listComponent}
          </section>
        </div>)
    }
    
const mapToProps = ({ mydata }) => ({ mydata });
export default connect(mapToProps)(Home);