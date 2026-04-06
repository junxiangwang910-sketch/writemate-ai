clear; clc; close all;

%% Homework 2 - Topic 1: Optimization (II)
% Part 1: visualize the 2D objective function and pick a good starting point.
% Part 2: estimate k1 and k2 by least squares and plot the SSE surface.

%% Part 1 - 2D objective function
x = 0:0.01:4;
y = -1:0.01:1.5;
[X, Y] = meshgrid(x, y);
Z = objfun(X, Y);

figure('Name', 'Objective Function Contour');
contourf(X, Y, Z, 200, 'LineColor', 'none');
colorbar;
xlabel('x');
ylabel('y');
title('Contour of f(x,y)');
hold on;

% Use a grid search to pick starting points automatically.
[zMin0, idxMin] = min(Z(:));
[rowMin, colMin] = ind2sub(size(Z), idxMin);
x0_min = [X(rowMin, colMin), Y(rowMin, colMin)];

[zMax0, idxMax] = max(Z(:));
[rowMax, colMax] = ind2sub(size(Z), idxMax);
x0_max = [X(rowMax, colMax), Y(rowMax, colMax)];

plot(x0_min(1), x0_min(2), 'wo', 'MarkerFaceColor', 'r', 'MarkerSize', 8);
plot(x0_max(1), x0_max(2), 'ws', 'MarkerFaceColor', 'y', 'MarkerSize', 8);
legend('f(x,y)', 'grid start for minimum', 'grid start for maximum', ...
    'Location', 'best');

% Refine the minimum and maximum with fminsearch.
minProblem = @(v) boundedObj(v, @objfun, [0, -1], [4, 1.5]);
maxProblem = @(v) boundedObj(v, @(a, b) -objfun(a, b), [0, -1], [4, 1.5]);

opts = optimset('Display', 'off', 'TolX', 1e-10, 'TolFun', 1e-10);
[xmin, fminValue] = fminsearch(minProblem, x0_min, opts);
[xmax, negFmaxValue] = fminsearch(maxProblem, x0_max, opts);
fmaxValue = -negFmaxValue;

plot(xmin(1), xmin(2), 'kp', 'MarkerFaceColor', 'c', 'MarkerSize', 12);
plot(xmax(1), xmax(2), 'kd', 'MarkerFaceColor', 'g', 'MarkerSize', 9);

fprintf('Part 1 results\n');
fprintf('Grid-based starting point for minimum : (%.4f, %.4f), f = %.6f\n', ...
    x0_min(1), x0_min(2), zMin0);
fprintf('Refined minimum in the domain        : (%.6f, %.6f), f = %.6f\n', ...
    xmin(1), xmin(2), fminValue);
fprintf('Grid-based starting point for maximum : (%.4f, %.4f), f = %.6f\n', ...
    x0_max(1), x0_max(2), zMax0);
fprintf('Refined maximum in the domain         : (%.6f, %.6f), f = %.6f\n\n', ...
    xmax(1), xmax(2), fmaxValue);

%% Part 2 - Estimate k1 and k2 by minimizing the sum of squared errors
tData = [0.5; 1.0; 1.5];
yObserved = [0.263; 0.455; 0.548];

% Use logarithmic variables so the fitted parameters stay positive.
u0 = log([0.7; 0.2]);
[uBest, phiMin] = fminsearch(@(u) sseInLogSpace(u, tData, yObserved), u0, opts);
kBest = exp(uBest);
k1 = kBest(1);
k2 = kBest(2);

yFit = ypred([k1; k2], tData);

fprintf('Part 2 results\n');
fprintf('Estimated k1 = %.6f\n', k1);
fprintf('Estimated k2 = %.6f\n', k2);
fprintf('Minimum SSE  = %.8f\n', phiMin);

resultTable = table(tData, yObserved, yFit, yObserved - yFit, ...
    'VariableNames', {'t', 'y_observed', 'y_predicted', 'residual'});
disp(resultTable);

% Plot the SSE surface.
k1Grid = linspace(0.05, 2.0, 220);
k2Grid = linspace(0.05, 1.5, 220);
[K1, K2] = meshgrid(k1Grid, k2Grid);
PHI = nan(size(K1));

for m = 1:size(K1, 1)
    for n = 1:size(K1, 2)
        PHI(m, n) = sse([K1(m, n); K2(m, n)], tData, yObserved);
    end
end

figure('Name', 'SSE Surface');
surf(K1, K2, PHI, 'EdgeColor', 'none');
xlabel('k_1');
ylabel('k_2');
zlabel('\phi');
title('Sum-of-squares surface');
colorbar;
view(135, 30);
hold on;
plot3(k1, k2, phiMin, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 14);

figure('Name', 'SSE Contour');
contourf(K1, K2, PHI, 40, 'LineColor', 'none');
colorbar;
xlabel('k_1');
ylabel('k_2');
title('Contour of the sum-of-squares surface');
hold on;
plot(k1, k2, 'rp', 'MarkerFaceColor', 'y', 'MarkerSize', 12);

%% Local functions
function z = objfun(x, y)
z = x .* y + 5 .* x + y - x.^2 - 2 .* y.^2 - exp(x .* y) + 1;
end

function val = boundedObj(v, funHandle, lb, ub)
penalty = 0;
if any(v < lb) || any(v > ub)
    penalty = 1e6 + 1e6 * sum(max(lb - v, 0).^2 + max(v - ub, 0).^2);
end
val = funHandle(v(1), v(2)) + penalty;
end

function val = sse(k, t, yObs)
k1 = k(1);
k2 = k(2);

if k1 <= 0 || k2 <= 0 || abs(k1 - k2) < 1e-8
    val = 1e12;
    return;
end

yCalc = ypred(k, t);
val = sum((yObs - yCalc).^2);
end

function val = sseInLogSpace(u, t, yObs)
k = exp(u);
val = sse(k, t, yObs);
end

function yCalc = ypred(k, t)
k1 = k(1);
k2 = k(2);
yCalc = k1 ./ (k1 - k2) .* (exp(-k2 .* t) - exp(-k1 .* t));
end
