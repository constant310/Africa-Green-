import React from 'react'

export default function Login({ onSwitch, onNext }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Welcome Back!</h2>
      <p className="mb-4 text-gray-600">Manage your account, build your lorem ipsum</p>
      <div className="space-y-3">
        <button
          className="w-full border rounded-lg py-2 flex justify-center items-center"
          onClick={() => {}}
        >
          <span className="mr-2">G</span> Google
        </button>
        <button
          className="w-full border rounded-lg py-2 flex justify-center items-center"
          onClick={() => {}}
        >
          <span className="mr-2">f</span> Facebook
        </button>
      </div>
      <div className="flex items-center my-4">
        <hr className="flex-grow border-gray-300" />
        <span className="px-2 text-gray-500">Or continue with email</span>
        <hr className="flex-grow border-gray-300" />
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email*</label>
          <input
            type="email"
            placeholder="elon@tesla.com"
            className="mt-1 block w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Password*</label>
            <button className="text-green-600 text-sm">Forget password</button>
          </div>
          <input
            type="password"
            placeholder="Enter secured password"
            className="mt-1 block w-full border rounded-lg p-2"
          />
        </div>
      </div>
      <button
        className="mt-6 w-full bg-green-800 text-white py-2 rounded-lg"
        onClick={onNext}
      >
        Login
      </button>
      <p className="mt-4 text-sm text-center">
        Don't have an account?{' '}
        <button className="text-green-600 font-medium" onClick={onSwitch}>
          Sign up
        </button>
      </p>
    </div>
  )
}