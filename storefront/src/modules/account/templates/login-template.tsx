"use client"

import { useState } from "react"
import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState("sign-in")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">LC</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
            La Cabrade
          </h1>
          <p className="text-gray-600 mt-2">
            {currentView === "sign-in" 
              ? "Connectez-vous à votre compte" 
              : "Créez votre compte"}
          </p>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-t-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setCurrentView("sign-in")}
              className={`flex-1 py-4 text-center font-semibold transition-all duration-200 ${
                currentView === "sign-in"
                  ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setCurrentView("register")}
              className={`flex-1 py-4 text-center font-semibold transition-all duration-200 ${
                currentView === "register"
                  ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Contenu */}
          <div className="p-6 sm:p-8">
            {currentView === "sign-in" ? (
              <Login setCurrentView={setCurrentView} />
            ) : (
              <Register setCurrentView={setCurrentView} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Besoin d'aide ?{" "}
            <a href="/contact" className="text-amber-600 hover:text-amber-700 font-medium">
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginTemplate
