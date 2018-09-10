% Random data for testing
% 
K = 10;
G = 100;
V = 200;
Ng = randi([1 10], 1, G);
graphs = cell(G);

for gi = 1 : G   
    nodes       = randi([1, V], 1, Ng(gi));    
    edges       = triu(randi([0 1], Ng(gi)));
    edges       = edges + triu(edges, 1)';
    
    edges(logical(eye(Ng(gi)))) = Inf;
    
    graph.nodes = nodes;
    graph.edges = edges;    
    graphs{gi}  = graph;
end

data.G = G;
data.V = V;
data.Ng = Ng;
data.graphs = graphs;

[ GTM, L_list ] = gtm_gs( data, K, 1, 5 );

plot(L_list)

%imagesc(GTM.phi)


