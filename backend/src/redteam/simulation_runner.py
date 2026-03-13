import threading
import time

class SimulationRunner:
    """Controls timing, scheduling, and execution of simulations."""
    def __init__(self, engine):
        self.engine = engine

    def launch(self, scenario):
        """Launch a simulation immediately."""
        return self.engine.run(scenario)

    def schedule(self, scenario, delay_seconds: int):
        def delayed_run():
            time.sleep(delay_seconds)
            self.engine.run(scenario)
        threading.Thread(target=delayed_run).start()
