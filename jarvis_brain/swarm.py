import os
import json
import asyncio
from typing import List, Dict, Any, Optional

try:
    from google import genai
except ImportError:
    genai = None

try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None

try:
    import ollama
except ImportError:
    ollama = None

from tools import tools

class SwarmAgent:
    def __init__(self, role: str, instruction: str, gemini_api_key: str = None):
        self.role = role
        self.instruction = instruction
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.client = None
        self.legacy_model = None
        self._init_client()

    def _init_client(self):
        if genai and self.gemini_api_key:
            try:
                self.client = genai.Client(api_key=self.gemini_api_key)
                return
            except Exception:
                pass
                
        if legacy_genai and self.gemini_api_key:
            try:
                legacy_genai.configure(api_key=self.gemini_api_key)
                self.legacy_model = legacy_genai.GenerativeModel(
                    model_name="gemini-2.0-flash",
                    system_instruction=self.instruction
                )
            except Exception:
                pass

    async def execute(self, task: str) -> str:
        prompt = f"System: {self.instruction}\n\nTask: {task}\n\nProvide your detailed response:"
        
        # 1. Try modern client
        if self.client:
            try:
                res = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                pass

        # 2. Try legacy client
        if self.legacy_model:
            try:
                res = self.legacy_model.generate_content(prompt)
                if res and res.text:
                    return res.text.strip()
            except Exception:
                pass

        # 3. Local Fallback
        if ollama:
            try:
                res = ollama.chat(
                    model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
                    messages=[
                        {"role": "system", "content": self.instruction},
                        {"role": "user", "content": task}
                    ]
                )
                return res["message"]["content"].strip()
            except Exception:
                pass
                
        return f"[{self.role}] Error: Unable to complete task due to LLM backend failure."

class HousePartyProtocol:
    """
    Multi-Agent Swarm Orchestrator
    """
    def __init__(self):
        self.researcher = SwarmAgent(
            role="Researcher",
            instruction="You are a meticulous research agent. Your job is to gather detailed, accurate information, summarize key points, and provide deep context on any given topic. Focus on data density and facts."
        )
        self.coder = SwarmAgent(
            role="Coder",
            instruction="You are an expert software engineer agent. Your job is to write clean, optimized, production-ready code. Provide only code and brief technical explanations. Avoid fluff."
        )
        self.executive = SwarmAgent(
            role="Executive",
            instruction="You are the executive summarizer. You take reports from other agents, synthesize them, and produce a final, polished executive summary or action plan."
        )
        
    async def dispatch_swarm(self, overarching_task: str) -> str:
        """Runs specialized agents in parallel and synthesizes the final output."""
        print(f"\033[96m[SWARM]\033[0m Dispatching House Party Protocol for: {overarching_task}")
        
        # Parallel Execution
        results = await asyncio.gather(
            self.researcher.execute(overarching_task),
            self.coder.execute(overarching_task)
        )
        
        research_report = results[0]
        code_report = results[1]
        
        synthesis_prompt = f"""
Overarching Task: {overarching_task}

[Researcher Report]:
{research_report}

[Coder Report]:
{code_report}

Please synthesize these two reports into a unified, high-quality final response for the user. 
        """
        
        final_output = await self.executive.execute(synthesis_prompt)
        print(f"\033[96m[SWARM]\033[0m Synthesis complete.")
        return final_output

swarm_orchestrator = HousePartyProtocol()
