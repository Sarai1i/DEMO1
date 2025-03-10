import React from "react";
import { useNavigate } from "react-router-dom";

const RaqeemTool = () => {
  const navigate = useNavigate();

  const handleDetailsClick = () => {
    navigate("/raqeem");
  };

  return (
    <div className="animate__animated animate__fadeInDown">
      <div className="surface-card p-4 h-full shadow-lg rounded-lg text-center">
        <span className="p-3 flex justify-center items-center">
          <img width="50" src="/assets/tool-raqeem.svg" alt="رقيم" />
        </span>
        <p className="mx-2 mb-1 label font-bold text-lg text-gray-800">رقيم</p>
        <p className="text-500 mb-3 font-medium text-gray-600">Raqeem OCR</p>
        <hr />
        <button
          className="px-4 py-2 mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          onClick={handleDetailsClick}
        >
          التفاصيل
        </button>
      </div>
    </div>
  );
};

export default RaqeemTool;
