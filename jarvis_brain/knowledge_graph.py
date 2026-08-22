import os
import json
try:
    import networkx as nx
except ImportError:
    nx = None

class NeuralKnowledgeGraph:
    def __init__(self, db_path: str = "jarvis_graph.json"):
        self.db_path = os.path.join(os.path.dirname(__file__), db_path)
        self.graph = nx.DiGraph() if nx else None
        self._load_graph()

    def _load_graph(self):
        if not self.graph:
            return
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, "r") as f:
                    data = json.load(f)
                    self.graph = nx.node_link_graph(data)
            except Exception as e:
                print(f"[GRAPH DB WARNING] Failed to load Neural Graph: {e}")

    def _save_graph(self):
        if not self.graph:
            return
        try:
            data = nx.node_link_data(self.graph)
            with open(self.db_path, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"[GRAPH DB WARNING] Failed to save Neural Graph: {e}")

    def add_relationship(self, entity1: str, relation: str, entity2: str) -> str:
        """Adds a relationship to the knowledge graph."""
        if not self.graph:
            return "Neural Knowledge Graph disabled (networkx not installed)."
        
        e1 = entity1.lower().strip()
        e2 = entity2.lower().strip()
        rel = relation.lower().strip()
        
        self.graph.add_node(e1)
        self.graph.add_node(e2)
        self.graph.add_edge(e1, e2, relationship=rel)
        
        self._save_graph()
        return f"Neural link established: [{entity1}] --({relation})--> [{entity2}]"

    def query_entity(self, entity: str) -> str:
        """Finds all relationships for a given entity."""
        if not self.graph:
            return "Neural Knowledge Graph disabled."
            
        e = entity.lower().strip()
        if e not in self.graph:
            return f"Entity '{entity}' not found in Neural Graph."
            
        out_edges = self.graph.out_edges(e, data=True)
        in_edges = self.graph.in_edges(e, data=True)
        
        results = []
        for src, dst, data in out_edges:
            results.append(f"{src} --({data.get('relationship')})--> {dst}")
        for src, dst, data in in_edges:
            results.append(f"{src} --({data.get('relationship')})--> {dst}")
            
        if not results:
            return f"Entity '{entity}' has no mapped connections."
            
        return "Connections:\n" + "\n".join(results)

neural_graph = NeuralKnowledgeGraph()
