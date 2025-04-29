"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface SearchBarProps {
  onSearch: (username: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [username, setUsername] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(username)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Enter Chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="pr-10 bg-gray-900 border-gray-700 focus:border-purple-500 focus:ring-purple-500"
        />
      </div>
      <Button type="submit" className="ml-2 bg-purple-600 hover:bg-purple-700">
        <Search className="h-4 w-4 mr-2" />
        Analyze
      </Button>
    </form>
  )
}
