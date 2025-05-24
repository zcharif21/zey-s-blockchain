from graphviz import Digraph

dot = Digraph(comment='Architecture Blockchain e-Sante')

dot.node('A', 'Microservice medcin')
dot.node('B', 'Blockchain Node')
dot.node('C', 'Base de Donnees')
dot.node('D', 'Docker Container')

dot.edges(['AB', 'BC'])
dot.edge('A', 'D', label='Dockerized')

dot.render('architecture_esante', format='png', view=True)
