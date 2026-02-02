
"use client";

import VoiceChat from "@/components/VoiceComponent";
import { useState } from "react";

export default function Home() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (firstName: string, lastName: string, email: string) => {
    return firstName.trim() !== "" && lastName.trim() !== "" && validateEmail(email);
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFirstName = e.target.value;
    setFirstName(newFirstName);
    setIsFormValid(validateForm(newFirstName, lastName, email));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLastName = e.target.value;
    setLastName(newLastName);
    setIsFormValid(validateForm(firstName, newLastName, email));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsFormValid(validateForm(firstName, lastName, newEmail));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">
      <div className="text-center mb-4">
        <img src="/logo-aroha.png" alt="Aro Ha Logo" className="w-24 mx-auto mb-3" />
        <h1 className="text-4xl mb-1 font-bold">Preparing for your Arrival</h1>
        <h2 className="text-xl mb-4">Help us create your perfect retreat</h2>
      </div>

      <div className="w-full max-w-md mb-4 space-y-3">
        <input
          type="text"
          value={firstName}
          onChange={handleFirstNameChange}
          placeholder="Enter your first name"
          className="w-full p-3 border rounded-md text-black"
          required
        />
        <input
          type="text"
          value={lastName}
          onChange={handleLastNameChange}
          placeholder="Enter your last name"
          className="w-full p-3 border rounded-md text-black"
          required
        />
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="Enter your email address"
          className="w-full p-3 border rounded-md text-black"
          required
        />
        {(firstName || lastName || email) && !isFormValid && (
          <div className="text-red-500 text-sm space-y-1">
            {firstName.trim() === "" && <p>First name is required</p>}
            {lastName.trim() === "" && <p>Last name is required</p>}
            {email && !validateEmail(email) && <p>Please enter a valid email address</p>}
          </div>
        )}
      </div>

     

      {isFormValid && <VoiceChat firstName={firstName} lastName={lastName} email={email} />}

      <small className="text-xs text-gray-500 mt-6 mb-2">
        Approve microphone access to speak with our voice assistant Lumi.
      </small>

      <p className="text-sm text-gray-600 mt-4">
        If you would prefer to fill-out our pre-arrival form with text, <a href="https://airtable.com/appYyHfcKqfRGpuGS/shrrtVl41Q52nvmTp" target="_blank" rel="noopener noreferrer" className="text-[#737150] hover:underline">click here</a>.
      </p>
    </main>
  );
}
