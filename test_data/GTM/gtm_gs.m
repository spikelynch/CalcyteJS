% Implementation of GTM by Gibbs sampling
% 
% 
% 
% Input:
%             data.G                - graph number
%             data.N                - node vocabulary size
%             data.graphs           - graph list
%             K                     - topic number
% Output:
% 
%             GTM                   - model output
%             L                     - Log likelihood list
% 
% Random data for testing:
% 
%                     K = 10;
%                     G = 100;
%                     V = 200;
%                     Ng = randi([1 10], 1, G);
%                     graphs = cell(G);
% 
%                     for gi = 1 : G   
%                         nodes       = randi([1, V], 1, Ng(gi));    
%                         edges       = triu(randi([0 1], Ng(gi)));
%                         edges       = edges + triu(edges, 1)';
% 
%                         edges(logical(eye(Ng(gi)))) = Inf;
% 
%                         graph.nodes = nodes;
%                         graph.edges = edges;    
%                         graphs{gi}  = graph;
%                     end
% 
%                     data.G = G;
%                     data.V = V;
%                     data.Ng = Ng;
%                     data.graphs = graphs;

function [ GTM, L_list ] = gtm_gs( data, K, alpha, beta )

    L_list = [];
   
    % initialization
    fprintf('----- GTM model initialization........  \n');
    [G, V, Ng, graphs, theta, z, phi, phi_norm, GKC, KV, KK] = intialization(data, K, alpha, beta);
     
    % output
    phi_expc   = zeros(K, V);
    theta_expc = zeros(G, K);
    samplenum  = 0;
    
    % start Gibbs sampling
    iter_max = 1000;
    burnin   = 100;
    inteval  = 20;
    it       = 1;
    
    while it <= iter_max
        
        fprintf('----- Gibbs sampling  iternum: %d \n', it);
                
        %update z
        fprintf('-----                                    update z \n');
        tic;
        [z, GKC, KV, KK]    = Update_z(G, K, Ng, graphs, theta, z, phi, phi_norm, GKC, KV, KK);        
        fprintf('-----                                                   use time: %d \n', toc);
        
        %update theta
        fprintf('-----                                    update theta \n');
        tic;
        theta               = Update_theta(GKC, K, alpha);
        fprintf('-----                                                   use time: %d \n', toc);
                
        %update phi
        fprintf('-----                                    update phi \n');
        tic;
        [phi, phi_norm]     = Update_phi(phi, phi_norm, K, V, KV, KK, beta);
        fprintf('-----                                                   use time: %d \n', toc);
        
        %evaluate loglikehd
        fprintf('-----                                    evaluate logLikelihood \n');
        tic;
        [L]                 = Evaluate_likehd(phi, phi_norm, K, V, KV, KK, beta);
        fprintf('-----                     L: %d  \n', L);
        fprintf('-----                                                   use time: %d \n', toc);
        
        L_list = [L_list, L];
        
        % collect samples
        if it > burnin && rem(it, inteval) == 0
            
            phi_expc   = phi_expc + phi;
            theta_expc = theta_expc + theta;
            
            samplenum  = samplenum + 1;            
        end
        
        it     = it + 1;        
    end
    
    % output
    GTM.phi   = phi_expc / samplenum;
    GTM.theta = theta_expc / samplenum;
        
end

function [G, V, Ng, graphs, theta, z, phi, phi_norm, GKC, KV, KK] = intialization(data, K, alpha, beta)

    G       = data.G;
    V       = data.V;
    graphs  = data.graphs;
    Ng      = data.Ng;
    
    %
    GKC = zeros(G, K);
    KV  = zeros(K, V);
    KK  = zeros(K, 2, K);
    
    % z
    z = cell(1, G);
    k_tmp = [];
    v_tmp = [];
    
    for gi = 1:G       
        g       = graphs{gi};        
        nodes_g = g.nodes;  
        edges_g = g.edges;
        z_g     = randi([1 K], 1, length(nodes_g));             
        z{gi}   = z_g;
        
        for k = 1 : K
            idxz       = find(z_g == k);
            kc         = length(idxz);
            GKC(gi, k) = kc;
            
            [~,link_z]   = find(edges_g(idxz, :) == 1);
            link_k       = z_g(link_z);
            
            [~,nolink_z] = find(edges_g(idxz, :) == 0);
            nolink_k     = z_g(nolink_z);
            
            if ~isempty(link_k)
                tab_link             = tabulate(link_k);
                k_list_tmp           = tab_link(:, 1);
                k_count_tmp          = tab_link(:, 2);
                KK(k, 1, k_list_tmp) = reshape(KK(k, 1, k_list_tmp), length(k_list_tmp), 1) + k_count_tmp ;
            end
            
            if ~isempty(nolink_k)
                tab_nolink           = tabulate(nolink_k);
                k_list_tmp           = tab_nolink(:, 1);
                k_count_tmp          = tab_nolink(:, 2);
                KK(k, 2, k_list_tmp) = reshape(KK(k, 2, k_list_tmp), length(k_list_tmp), 1) + k_count_tmp ;
            end
                              
        end
        
        k_tmp = [k_tmp z_g];
        v_tmp = [v_tmp nodes_g];
    end
    
    % theta
    theta     = gamrnd(alpha * ones(G, K), 1);
    theta     = theta ./ repmat(sum(theta, 2), 1, K);
   
    % phi
    phi       = gamrnd(beta * ones(K, V), 1);
    phi       = phi ./ repmat(sum(phi, 2), 1, V); 
    
    phi_norm  = zeros(1, K);
    
    for k = 1 : K       
        v_list            = zeros(1, V);
        idx               = find(k_tmp == k);
        tab               = tabulate(v_tmp(idx));        
        v_list(tab(:, 1)) = tab(:, 2);
        KV(k, :)          = v_list;  
        phi_norm(k)       = norm(phi(k, :));
    end
    

end


function theta  = Update_theta(GKC, K, alpha)
    
    theta     = gamrnd(GKC+alpha, 1);
    theta     = theta ./ repmat(sum(theta, 2), 1, K);
   
end


function [z, GKC, KV, KK]   = Update_z(G, K, Ng, graphs, theta, z, phi, phi_norm, GKC, KV, KK)

    KK          = zeros(K, 2, K);
    
    k_new_ratio = 0;
    %zall        = sum(Ng);

    for gi = 1 : G
        
       z_g     = z{gi};       
       g       = graphs{gi};
       nodes_g = g.nodes;
       edges_g = g.edges;
       
       for zi = 1 : Ng(gi)
          
           k_old    = z_g(zi);
           v_zi     = nodes_g(zi);
           
           pk       = log(theta(gi, :) + eps) + transp(log(phi(:, v_zi) + eps));
                      
           link_z   = find(edges_g(zi, :) == 1);
           link_k   = z_g(link_z);  
           
           if ~isempty(link_k)
                pk       = pk + transpose(sum(log( (phi * phi(link_k, :)') ./ ( phi_norm' * phi_norm(link_k)) + eps), 2));
           end
           
           nolink_z = find(edges_g(zi, :) == 0);           
           nolink_k = z_g(nolink_z);
           
           if ~isempty(nolink_k)
                pk       = pk + transpose(sum(log(1- (phi * phi(nolink_k, :)') ./ ( phi_norm' * phi_norm(nolink_k)) + eps), 2));
           end
           
           p        =   1 ./ sum(exp(repmat(pk, [K 1]) - repmat(pk', [1 K])), 2);                  
           k_new    =   find(mnrnd(1, p) == 1);
           
           if k_old ~= k_new
               
               k_new_ratio      = k_new_ratio + 1;
               
               z_g(zi)          = k_new;
               GKC(gi, k_old)   = GKC(gi, k_old) - 1;
               GKC(gi, k_new)   = GKC(gi, k_new) + 1;
               KV(k_old, v_zi)  = KV(k_old, v_zi) - 1;
               KV(k_new, v_zi)  = KV(k_new, v_zi) + 1;
               
           end
           
       end
        
       z{gi} = z_g;
       
       %
       for k = 1 : K
           idxz = find(z_g == k);
           
           if ~isempty(idxz)
               
               [~,link_z]   = find(edges_g(idxz, :) == 1);
               link_k       = z_g(link_z);
               
               [~,nolink_z] = find(edges_g(idxz, :) == 0);
               nolink_k     = z_g(nolink_z);
               
               if ~isempty(link_k)
                   tab_link             = tabulate(link_k);
                   k_list_tmp           = tab_link(:, 1);
                   k_count_tmp          = tab_link(:, 2);
                   KK(k, 1, k_list_tmp) = reshape(KK(k, 1, k_list_tmp), length(k_list_tmp), 1) + k_count_tmp ;
               end
               
               if ~isempty(nolink_k)
                   tab_nolink           = tabulate(nolink_k);
                   k_list_tmp           = tab_nolink(:, 1);
                   k_count_tmp          = tab_nolink(:, 2);
                   KK(k, 2, k_list_tmp) = reshape(KK(k, 2, k_list_tmp), length(k_list_tmp), 1) + k_count_tmp ;
               end
           end
       end
              
    end

    %fprintf('-----                                                 z accepted ratio is %d   \n', k_new_ratio/zall);        
               
end


function [phi, phi_norm]  = Update_phi(phi, phi_norm, K, V, KV, KK, beta)
    
    samplenum = 100;
    
    for k = 1 : K
        
        phik_expc       = zeros(1, V);
        
        phik_old        = phi(k, :);
        phik_norm_old   = phi_norm(k);
        
        %
        K_link          = reshape(KK(k, 1, :), 1, K);
        K_nolink        = reshape(KK(k, 2, :), 1, K);
            
        it = 1;
        
        while it <= samplenum
        
            phik_prop             = gamrnd(beta, 1, 1, V);
            phik_prop             = phik_prop/sum(phik_prop);
            phik_norm_prop        = norm(phik_prop);
              
            %
            phi(k, :)             = phik_old;
            phi_norm(k)           = phik_norm_old;
            
            node_loglik_old       = sum(KV(k, :) .* log(phik_old + eps));
            link_loglik_old       = sum(K_link .* log((phik_old * phi') ./ (phik_norm_old * phi_norm) + eps) );
            tmp                   = log(1 - (phik_old * phi') ./ (phik_norm_old * phi_norm) + eps);
            tmp(k)                = log(eps);
            nolink_loglik_old     = sum(K_nolink .* tmp);
            
            %
            phi(k, :)             = phik_prop;            
            phi_norm(k)           = phik_norm_prop;
            
            node_loglik_prop      = sum(KV(k, :) .* log(phik_prop + eps));
            link_loglik_prop      = sum(K_link .* log((phik_prop * phi') ./ (phik_norm_prop * phi_norm) + eps) );
            tmp                   = log(1 - (phik_prop * phi') ./ (phik_norm_prop * phi_norm) + eps);
            tmp(k)                = log(eps);
            nolink_loglik_prop    = sum(K_nolink .* tmp);
            
            ratio                 = node_loglik_prop - node_loglik_old ...
                                        + link_loglik_prop - link_loglik_old ...
                                        + nolink_loglik_prop - nolink_loglik_old;
            
            x = rand();
            
            if exp(ratio) > x
                phik_expc     = phik_expc + phik_prop;
                phik_old      = phik_prop;
                phik_norm_old = norm(phik_prop);
%                 phi_ratio   = phi_ratio + 1;
            else
                phik_expc = phik_expc + phik_old;                
            end
            
            it = it + 1;
        end
        
        phi(k, :)   =  phik_expc/samplenum;
        phi_norm(k) =  norm(phi(k, :));
                
    end
    
%     fprintf('-----                                                               phi accepted ratio: %d !  \n', phi_ratio/K);

end


function [L]  = Evaluate_likehd(phi, phi_norm, K, V, KV, KK, beta)
    
    L = 0;

    for k = 1 : K
        
        phik                  = phi(k, :);
        phik_norm             = phi_norm(k);
        
        %
        node_loglik           = sum(KV(k, :) .* log(phik + eps));
        
        %
        K_link                = reshape(KK(k, 1, k:end), 1, K-k+1);
        K_nolink              = reshape(KK(k, 2, k:end), 1, K-k+1);
               
        link_loglik           = sum(K_link .* log((phik * phi(k:end, :)') ./ (phik_norm * phi_norm(k:end)) + eps) );
        tmp                   = log(1 - (phik * phi(k:end, :)') ./ (phik_norm * phi_norm(k:end)) + eps);        
        tmp(1)                = log(eps);
        nolink_loglik         = sum(K_nolink .* tmp);
                
        L                     = L + node_loglik + link_loglik + nolink_loglik;        
    end
    
    %fprintf('-----                                                               L =  %d   \n',L);

end




