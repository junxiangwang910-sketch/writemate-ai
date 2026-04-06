function y = ypred_fun(k1, k2, t)
y = k1./(k1-k2) .* (exp(-k2.*t) - exp(-k1.*t));
end
