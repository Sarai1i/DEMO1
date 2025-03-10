import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark"
      style={{ backgroundColor: "#13836E", fontFamily: "Lama Sans" }} // ✅ تطبيق الخط على كل النصوص
    >
      <div className="container">
        <Link className="navbar-brand text-white fw-bold" to="/" style={{ fontFamily: "Lama Sans" }}>
          أداة رقيم
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link text-white fw-bold" to="/" style={{ fontFamily: "Lama Sans" }}>
                الرئيسية
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-white fw-bold" to="/about" style={{ fontFamily: "Lama Sans" }}>
                عن فلك
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-white fw-bold" to="/blogs" style={{ fontFamily: "Lama Sans" }}>
                المدونات
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-white fw-bold" to="/frequency-lists" style={{ fontFamily: "Lama Sans" }}>
                قوائم الشيوع
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-white fw-bold" to="/contact" style={{ fontFamily: "Lama Sans" }}>
                اتصل بنا
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
