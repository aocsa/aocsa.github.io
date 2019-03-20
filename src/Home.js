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
      <h1 aria-label=" Hola, Soy..." className="blast-root">
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>A</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>l</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>x</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>a</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>n</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>d</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>r&nbsp;</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>O</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>c</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>s</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>a</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>,</span><br></br>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>P</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>h</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>D in &nbsp;</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>C</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>o</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>m</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>p</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>u</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>t</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{ opacity: "1" }}>r &nbsp;</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>S</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>c</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>i</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>n</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>c</span>
        <span className="blast" aria-hidden="true" style={{opacity: "1"}}>e</span>
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
      let about_me = mydata.about_me;
      return (
        <div>
          <Header />
          <section >
            <InitPage
              key={0}
              name={about_me.fullname}
              education={about_me.title}
              bio={about_me.summary}
              index={0}
            />
          </section>
        </div>)
    }
    
const mapToProps = ({ mydata }) => ({ mydata });
export default connect(mapToProps)(Home);